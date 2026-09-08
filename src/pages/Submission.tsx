import React, { useState, useEffect } from 'react';
import { ArrowLeft, ExternalLink, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Navigation from '@/components/Navigation';
import AnimatedBackground from '@/components/AnimatedBackground';

const Submission = () => {
  useEffect(() => {
      window.scrollTo(0, 0);
  }, []);
  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      <AnimatedBackground />
      <Navigation />
      
      <main className="relative z-10 pt-20">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <Button 
              variant="ghost" 
              onClick={() => window.history.back()}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-quantum via-molecule to-neuron bg-clip-text text-transparent mb-6 text-center">
              Submit Your Article
            </h1>

            <p className="text-xl text-muted-foreground mb-12 text-center">
              Ready to share your passion for science? Click the button below to submit your article through our Google Form.
            </p>
          </div>

          {/* Google Form Button */}
          <div className="bg-card/60 backdrop-blur-sm border border-border rounded-lg p-8 mb-8 text-center">
            <h2 className="text-2xl font-bold text-foreground mb-4">Article Submission Form</h2>
            <p className="text-muted-foreground mb-6">
              Click the button below to access our submission form where you can upload your article and provide all necessary details.
            </p>
            <Button 
              size="lg" 
              className="px-8 py-3"
              onClick={() => window.open('https://forms.gle/sTmMboMnpGJeJPNHA', '_blank', 'noopener,noreferrer')}
            >
              <ExternalLink className="w-5 h-5 mr-2" />
              Submit Your Article
            </Button>
          </div>

          {/* Submission Guidelines */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-6 text-center">Submission Guidelines</h2>
            <h4 className="text-2xl font-bold text-foreground mb-6 text-center">ScienceGlimpse Article</h4>            
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Article Requirements */}
            <div className="bg-card/60 backdrop-blur-sm border border-border rounded-lg p-6">
              <h3 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <FileText className="w-6 h-6 text-primary" />
                Article Requirements
              </h3>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  800–1500 words (approx. 5-minute read)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  Original content written by you
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  Accessible to high school students
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  Properly cited sources (APA format preferred)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  Clear introduction, body, and conclusion
                </li>
              </ul>
            </div>

            {/* What We Look For */}
            <div className="bg-card/60 backdrop-blur-sm border border-border rounded-lg p-6">
              <h3 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <span className="text-2xl">🔍</span>
                What We Look For
              </h3>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  Clear, engaging writing style
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  Scientific accuracy
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  Unique perspective or insight
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  Engaging and unique hook to introduce topic
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  Relevance to current science topics
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  Enthusiasm for the subject
                </li>
              </ul>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-6 text-center"> </h2>
            <h4 className="text-2xl font-bold text-foreground mb-6 text-center">ScienceGlimpse Junior Article</h4>            
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Article Requirements */}
            <div className="bg-card/60 backdrop-blur-sm border border-border rounded-lg p-6">
              <h3 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <FileText className="w-6 h-6 text-primary" />
                Article Requirements
              </h3>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  600-1200 words (approximately 4-minute read)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  Original content written by you
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  Simple, everyday life topics
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  Elementary or Middle school level understanding
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  Clear introduction, body, and conclusion
                </li>
              </ul>
            </div>

            {/* What We Look For */}
            <div className="bg-card/60 backdrop-blur-sm border border-border rounded-lg p-6">
              <h3 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <span className="text-2xl">🔍</span>
                What We Look For
              </h3>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  Fun, engaging writing style
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  Appealing hook for younger minds
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  Silly, unique facts
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  Scientific accuracy in information
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  Enthusiasm for the subject
                </li>
              </ul>
            </div>
          </div>
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-6 text-center"> </h2>
            <h4 className="text-2xl font-bold text-foreground mb-6 text-center">ScienceGlimpse Debunked Article</h4>            
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Article Requirements */}
            <div className="bg-card/60 backdrop-blur-sm border border-border rounded-lg p-6">
              <h3 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <FileText className="w-6 h-6 text-primary" />
                Article Requirements
              </h3>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  600-1200 words (approximately 4-minute read)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  Original content written by you
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  Should be a relevant myth (popular: common objects, ideas, or understanding)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  Myth should not already be written about
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  Middle school level understanding
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  Clear introduction, body, and conclusion
                </li>
              </ul>
            </div>

            {/* What We Look For */}
            <div className="bg-card/60 backdrop-blur-sm border border-border rounded-lg p-6">
              <h3 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <span className="text-2xl">🔍</span>
                What We Look For
              </h3>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  Engaging writing style
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  Unique hook to introduce your topic
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  Scientific accuracy in information* (when debunking, this is key)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  Enthusiasm for the subject
                </li>
              </ul>
            </div>
          </div>
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-6 text-center"> </h2>
            <h4 className="text-2xl font-bold text-foreground mb-6 text-center">ScienceGlimpse Creature Profile Article</h4>            
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Article Requirements */}
            <div className="bg-card/60 backdrop-blur-sm border border-border rounded-lg p-6">
              <h3 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <FileText className="w-6 h-6 text-primary" />
                Article Requirements
              </h3>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  600-1200 words (approximately 4-minute read)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  Original content written by you
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  The creature should not have been written about before
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  Elementary or Middle school level understanding
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  Clear introduction, body, and conclusion
                </li>
              </ul>
            </div>

            {/* What We Look For */}
            <div className="bg-card/60 backdrop-blur-sm border border-border rounded-lg p-6">
              <h3 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <span className="text-2xl">🔍</span>
                What We Look For
              </h3>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  Fun, engaging writing style
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  Appealing hook relevant to the creature
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  Silly, unique facts sprinkled in
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  Scientific accuracy in information
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  Enthusiasm for the subject
                </li> 
              </ul>
            </div>
          </div>
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-6 text-center"> </h2>
            <h4 className="text-2xl font-bold text-foreground mb-6 text-center">ScienceGlimpse What If Article</h4>            
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Article Requirements */}
            <div className="bg-card/60 backdrop-blur-sm border border-border rounded-lg p-6">
              <h3 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <FileText className="w-6 h-6 text-primary" />
                Article Requirements
              </h3>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  600-1200 words (approximately 4-minute read)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  Original content written by you
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  Topic can range in complexity (simple or complex is acceptable)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  The scenario should be scientifically explained clearly
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  Middle school level understanding
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  Clear introduction, body, and conclusion
                </li>
              </ul>
            </div>

            {/* What We Look For */}
            <div className="bg-card/60 backdrop-blur-sm border border-border rounded-lg p-6">
              <h3 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <span className="text-2xl">🔍</span>
                What We Look For
              </h3>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  Engaging writing style
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  Make your “What If” unique if you can
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  Creativity in scenario explanation
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  Scientific accuracy in information
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  Enthusiasm for the subject
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Submission;
