import { useMemo, useState, type FormEvent } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { FilePlus, Loader2 } from "lucide-react";

import { db } from "../lib/firebase";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Textarea } from "./ui/textarea";
import { toast } from "./ui/sonner";

/**
 * The slice of a user the form needs to turn a typed username into an
 * account. Compatible with the dashboard's richer UserSummary, so the
 * caller can pass its user list straight through.
 */
export interface ArticleAuthorCandidate {
  uid: string;
  /** Only set when the stored username is actually valid to publish. */
  publishableUsername: string | null;
}

interface AddArticleDialogProps {
  /** Every account, used to resolve the author's username to a uid. */
  users: ArticleAuthorCandidate[];
  /** The signed-in moderator, recorded on the article and the grant. */
  moderatorUid: string;
  /** Called after a successful save so the dashboard can refresh totals. */
  onSaved: () => void;
}

/** Tokens awarded to an author with an account when their article goes up. */
const AUTHOR_TOKEN_REWARD = 50;

const EMPTY_FORM = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  category: "",
  author: "",
  readTime: "5 min",
  thumbnail: "",
  date: new Date().toISOString().slice(0, 10),
  references: "",
};

// Turn a title into a URL-safe slug: lowercase, non-alphanumerics to hyphens,
// no leading/trailing or doubled hyphens.
const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const normalizeUsername = (value: string): string =>
  value.trim().replace(/^@/, "").toLowerCase();

const AddArticleDialog = ({
  users,
  moderatorUid,
  onSaved,
}: AddArticleDialogProps) => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  // Once a moderator edits the slug by hand, stop syncing it to the title.
  const [slugEdited, setSlugEdited] = useState(false);
  const [hasAccount, setHasAccount] = useState(false);
  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Resolve valid usernames to uids once, for the author lookup.
  const usernameToUid = useMemo(() => {
    const map = new Map<string, string>();

    for (const candidate of users) {
      if (candidate.publishableUsername) {
        map.set(candidate.publishableUsername.toLowerCase(), candidate.uid);
      }
    }

    return map;
  }, [users]);

  const update = (field: keyof typeof EMPTY_FORM, value: string) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const handleTitleChange = (value: string) => {
    setForm((previous) => ({
      ...previous,
      title: value,
      // Keep the slug mirroring the title until it's been edited directly.
      slug: slugEdited ? previous.slug : slugify(value),
    }));
  };

  const resetForm = () => {
    setForm({
      ...EMPTY_FORM,
      date: new Date().toISOString().slice(0, 10),
    });
    setSlugEdited(false);
    setHasAccount(false);
    setUsername("");
    setUsernameError("");
  };

  const handleOpenChange = (next: boolean) => {
    // Don't let an accidental click-away discard a half-written article.
    if (!next && submitting) {
      return;
    }

    setOpen(next);

    if (!next) {
      resetForm();
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const title = form.title.trim();
    const slug = slugify(form.slug.trim());
    const excerpt = form.excerpt.trim();
    const content = form.content.trim();
    const author = form.author.trim();
    const categories = form.category
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
    const references = form.references
      .split("\n")
      .map((entry) => entry.trim())
      .filter(Boolean);

    if (!title || !slug || !excerpt || !content || !author) {
      toast.error(
        "Title, URL, excerpt, content and author are all required.",
      );
      return;
    }

    if (categories.length === 0) {
      toast.error("Add at least one category.");
      return;
    }

    // Resolve the author's account before touching Firestore so an invalid
    // username can be corrected without a wasted write (ask them again).
    let authorUid: string | null = null;

    if (hasAccount) {
      const typed = normalizeUsername(username);

      if (!typed) {
        setUsernameError("Enter the author's username.");
        return;
      }

      const matchedUid = usernameToUid.get(typed);

      if (!matchedUid) {
        setUsernameError(
          `No account with the username "${typed}". Check it and try again.`,
        );
        return;
      }

      authorUid = matchedUid;
      setUsernameError("");
    }

    setSubmitting(true);

    try {
      const articleRef = doc(db, "articles", slug);

      // A slug is the document ID, so refuse to silently overwrite one.
      const existing = await getDoc(articleRef);

      if (existing.exists()) {
        toast.error(
          `An article already uses the URL "${slug}". Choose another.`,
        );
        setSubmitting(false);
        return;
      }

      // Article IDs must stay within the reward system's range (1–1000, see
      // validArticleId in firestore.rules), so continue the sequence rather
      // than using a timestamp.
      const highest = await getDocs(
        query(collection(db, "articles"), orderBy("legacyId", "desc"), limit(1)),
      );
      const highestId = highest.empty
        ? 0
        : (highest.docs[0].data().legacyId as number | undefined) ?? 0;
      const nextId = highestId + 1;

      const batch = writeBatch(db);

      batch.set(articleRef, {
        slug,
        title,
        excerpt,
        content,
        category: categories,
        author,
        readTime: form.readTime.trim() || "5 min",
        thumbnail: form.thumbnail.trim(),
        date: form.date,
        references,
        legacyId: nextId,
        status: "published",
        createdBy: moderatorUid,
        ...(authorUid ? { authorUid } : {}),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        publishedAt: serverTimestamp(),
      });

      // Reward the author's account in the same atomic write, so tokens are
      // only ever granted alongside a genuinely-created article.
      if (authorUid) {
        const grantRef = doc(
          collection(db, "users", authorUid, "tokenAdjustments"),
        );

        batch.set(grantRef, {
          amount: AUTHOR_TOKEN_REWARD,
          reason: `Article published: ${title}`.slice(0, 200),
          moderatorUid,
          createdAt: serverTimestamp(),
        });
      }

      await batch.commit();

      toast.success(
        authorUid
          ? `Published "${title}" and awarded ${AUTHOR_TOKEN_REWARD} tokens to @${normalizeUsername(
              username,
            )}. It appears on the site after the next deploy.`
          : `Published "${title}". It appears on the site after the next deploy.`,
      );

      resetForm();
      setOpen(false);
      onSaved();
    } catch (error) {
      console.error("Could not add the article:", error);
      toast.error("The article could not be saved.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button">
          <FilePlus className="mr-2 h-4 w-4" />
          Add article
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add an article</DialogTitle>
          <DialogDescription>
            Saved to Firestore as a published article. It appears on the live
            site after the next build and deploy.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="article-title">Title</Label>
            <Input
              id="article-title"
              value={form.title}
              onChange={(event) => handleTitleChange(event.target.value)}
              placeholder="The Lightless Stars"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="article-slug">URL</Label>
            <Input
              id="article-slug"
              value={form.slug}
              onChange={(event) => {
                setSlugEdited(true);
                update("slug", event.target.value);
              }}
              placeholder="the-lightless-stars"
            />
            <p className="text-xs text-muted-foreground">
              The article's URL: /article/{form.slug || "your-slug"}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="article-excerpt">Excerpt</Label>
            <Textarea
              id="article-excerpt"
              value={form.excerpt}
              onChange={(event) => update("excerpt", event.target.value)}
              placeholder="A one or two sentence summary for cards and search results."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="article-content">Content</Label>
            <Textarea
              id="article-content"
              value={form.content}
              onChange={(event) => update("content", event.target.value)}
              placeholder="The full article body."
              rows={10}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="article-author">Author (display name)</Label>
              <Input
                id="article-author"
                value={form.author}
                onChange={(event) => update("author", event.target.value)}
                placeholder="Ansh Sharma"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="article-category">
                Categories (comma separated)
              </Label>
              <Input
                id="article-category"
                value={form.category}
                onChange={(event) => update("category", event.target.value)}
                placeholder="Physics, Astronomy"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="article-readtime">Read time</Label>
              <Input
                id="article-readtime"
                value={form.readTime}
                onChange={(event) => update("readTime", event.target.value)}
                placeholder="5 min"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="article-date">Date</Label>
              <Input
                id="article-date"
                type="date"
                value={form.date}
                onChange={(event) => update("date", event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="article-thumbnail">Thumbnail URL</Label>
            <Input
              id="article-thumbnail"
              value={form.thumbnail}
              onChange={(event) => update("thumbnail", event.target.value)}
              placeholder="https://images.scienceglimpse.org/image1.png"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="article-references">
              References (one per line, optional)
            </Label>
            <Textarea
              id="article-references"
              value={form.references}
              onChange={(event) => update("references", event.target.value)}
              placeholder={"Author, A. (2024). Title. Journal.\nhttps://..."}
              rows={3}
            />
          </div>

          {/* Optional: link the article to an author's account and reward it. */}
          <div className="rounded-lg border border-border p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="article-has-account">
                  Does the author have a ScienceGlimpse account?
                </Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  If so, they get {AUTHOR_TOKEN_REWARD} tokens when the article
                  is published.
                </p>
              </div>

              <Switch
                id="article-has-account"
                checked={hasAccount}
                onCheckedChange={(checked) => {
                  setHasAccount(checked);
                  setUsernameError("");
                  if (!checked) {
                    setUsername("");
                  }
                }}
              />
            </div>

            {hasAccount && (
              <div className="mt-4 space-y-2">
                <Label htmlFor="article-username">Author's username</Label>
                <Input
                  id="article-username"
                  value={username}
                  onChange={(event) => {
                    setUsername(event.target.value);
                    if (usernameError) {
                      setUsernameError("");
                    }
                  }}
                  placeholder="username"
                  aria-invalid={usernameError ? true : undefined}
                />
                {usernameError && (
                  <p role="alert" className="text-sm text-destructive">
                    {usernameError}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>

            <Button type="submit" disabled={submitting}>
              {submitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {submitting ? "Saving..." : "Publish article"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddArticleDialog;
