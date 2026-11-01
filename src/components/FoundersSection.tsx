import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Atom, Brain, Cpu, Dna, Earth, FlaskConical, Microscope, Quote, Stethoscope, Telescope, Wrench, type LucideIcon } from 'lucide-react';

interface Founder {
  name: string;
  role: string;
  mission: string;
  favoriteFields: LucideIcon[];
  quote: string;
}

const FoundersSection = () => {
  const navigate = useNavigate();

  const founders: Founder[] = [{
    name: 'Medhansh Garadala',
    role: 'Co-Founder: Executive Director & Head of Logistics',
    mission: 'Making complex quantum concepts accessible to every curious mind.',
    favoriteFields: [Atom, Brain, Telescope],
    quote: 'Science isn\'t about memorizing — it\'s about glimpsing the truth behind the universe\'s most beautiful and facinating mysteries.',
  }, {
    name: 'Ansh Sharma',
    role: 'Co-Founder: Director of Strategy & Lead Task Manager',
    mission: 'Blending storytelling with clarity to make research irresistible.',
    favoriteFields: [Microscope, Telescope, Atom],
    quote: 'We don\'t simplify science. We clarify it. There\'s a huge difference between the two — and it changes everything.',
  }, {
    name: 'Aarav Madan',
    role: 'Co-Founder: Director of Media & Creative Innovation Outreach',
    mission: 'To craft visual and narrative experiences that bring science to life—capturing wonder, curiosity, and design in every frame.',
    favoriteFields: [Wrench, Cpu, Earth],
    quote: 'Creativity is the science of seeing differently than your peers—then actually making it real.',
  }, {
    name: 'Ayush Srivastava',
    role: 'Co-Founder: Head Programmer & Lead Technical Coder',
    mission: 'To structure the backbone of the voices of tomorrow and facilitate the science of today.',
    favoriteFields: [Wrench, Cpu, FlaskConical],
    quote: 'Good code is what makes a website clear and functional. Great code is what makes a website unforgettable.',
  }, {
    name: 'Kavin Puri',
    role: 'Co-Founder: Head Developer & Director of Content & Design',
    mission: 'To fuse elegant design with clear information & talented members and channel a universe of scientific innovation.',
    favoriteFields: [Dna, Cpu, Stethoscope],
    quote: 'Every great team needs a great developer at its core to bring their vision to life & build towards the future of scientific collaboration.',
  }, {
    name: 'Saanvi Palagani',
    role: 'Co-Founder: Chief Editor & Publicity Director',
    mission: 'To amplify voices that turn raw ideas into crystal-clear narratives—making science accessible, bold, and beautiful.',
    favoriteFields: [Dna, Brain, FlaskConical],
    quote: 'Define Science.',
  }, {
    name: 'Mihir Harinath',
    role: 'Co-Founder: Lead Advisor & Event Organizer',
    mission: 'To orchestrate spaces where people connect and visions takes teams with passion to create meaningful experiences.',
    favoriteFields: [Wrench, Cpu, Earth],
    quote: 'STEM is the key to the future.',
  }];


  return (
    <section className="py-20 px-4 bg-muted/30" id="team">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-neuron to-cosmic bg-clip-text text-transparent mb-6">
            The Minds Behind the Glimpse
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Student researchers, science communicators, and dreamers building the future of scientific storytelling for generations to come.
          </p>
        </div>

        {/* Founders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {founders.map((founder) => (
            <div key={founder.name} className="group">
              <div className="card-lift h-full p-8 rounded-lg bg-card border border-border">
                <div className="space-y-6">
                  {/* Name and Role */}
                  <div className="space-y-2">
                    <h3 className="text-2xl font-semibold text-foreground group-hover:text-primary transition-colors duration-300">
                      {founder.name}
                    </h3>
                    <p className="text-primary font-medium">
                      {founder.role}
                    </p>
                  </div>

                  {/* Favorite Fields */}
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-muted-foreground font-medium">
                      Favorite Fields:
                    </span>
                    <div className="flex space-x-2">
                      {founder.favoriteFields.map((Field, i) => (
                        <Field key={i} className="h-5 w-5 text-primary group-hover:animate-bounce" aria-hidden="true" />
                      ))}
                    </div>
                  </div>

                  {/* Mission */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-foreground">
                      Mission
                    </h4>
                    <p className="text-muted-foreground leading-relaxed">
                      {founder.mission}
                    </p>
                  </div>

                  {/* Quote */}
                  <div className="bg-card/50 backdrop-blur-sm border border-border rounded-lg p-4 relative">
                    <Quote className="absolute top-2 left-2 w-4 h-4 text-primary/50" />
                    <blockquote className="text-foreground/90 italic pl-6 leading-relaxed">
                      {founder.quote}
                    </blockquote>
                  </div>

                  {/* Special badges for all team members */}
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-neuron rounded-full animate-pulse-glow" />
                    <span className="text-xs text-neuron font-medium">
                      Active Team Member
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Divisions (leads & members) */}
        <div className="mt-24">
          <h3 className="text-4xl md:text-5xl font-bold mb-6 text-center bg-gradient-to-r from-neuron to-cosmic bg-clip-text text-transparent">
            Team Divisions
          </h3>

          <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-12 text-center">
            Leads and members across our editorial and technical divisions. Click on any of the names of our Directors or writers below to view their published articles!
          </p>

          <div className="grid grid-cols-1 gap-6">
            {[
              {
                title: 'Media',
                director: 'Aarav Madan',
                mission: 'Create engaging visual and multimedia content that brings scientific stories to life.',
                members: ['Anusha Gupta', 'Aashrith Rallabandi', 'Ishaan Sankaran', 'Mikul Jain', 'Bhawit Paudel', 'Mokshit Annavajhula', 'Sai Krishna Karthikeya Ramadugu', 'Sai Pranav Anantharamakrishnan', 'Riya Pawar', 'Shyamala Sree Sridhar'],
              },
              {
                title: 'Editing',
                director: 'Saanvi Palagani',
                mission: 'Refine and fact-check submissions to ensure clarity, accuracy, and editorial quality.',
                members: ['Bhawit Paudel', 'Ishani Aluguvelli', 'Shareen Tarigonda'],
              },
              {
                title: 'Outreach',
                director: ['Medhansh Garadala', 'Mihir Harinath'],
                mission: 'Build community connections and broaden our readership through partnerships and events.',
                members: ['Vedika Kamble'],
              },
              {
                title: 'Coding',
                director: ['Kavin Puri', 'Ayush Srivastava'],
                mission: 'Build and maintain the site\'s technical infrastructure to deliver fast, accessible science content.',
                members: ['Tavish Choudhari', 'Sharmin Tarigonda'],
              }
            ].map((div) => (
              <div key={div.title}>
                <div className="p-6 md:p-10 rounded-lg bg-card border border-border transition-all duration-300 hover:scale-[1.01] hover:border-primary hover:shadow-[0_0_20px_rgba(124,58,237,0.15)]">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-8 w-full text-base">
                    <div className="md:w-5/12 flex flex-col space-y-4">
                      <div>
                        <h4 className="text-2xl font-semibold text-foreground">
                          {div.title}
                        </h4>

                        <p className="text-lg text-muted-foreground mt-2">
                          Director:{' '}
                          {Array.isArray(div.director) ? div.director.map((d: any, idx: number) => (
                            <span key={d}>
                              <button
                                onClick={() =>
                                  navigate(`/articles?author=${encodeURIComponent(d)}`)
                                }
                                className="inline text-lg font-semibold text-foreground underline-offset-4 hover:text-primary hover:underline mr-2"
                              >
                                {d}
                              </button>

                              {idx < (div.director as string[]).length - 1 ? (
                                <span className="text-muted-foreground mr-2">&amp;</span>
                              ) : null}
                            </span>
                          )) : (
                            <button
                              onClick={() =>
                                navigate(`/articles?author=${encodeURIComponent(div.director as string)}`)
                              }
                              className="inline text-lg font-semibold text-foreground underline-offset-4 hover:text-primary hover:underline"
                            >
                              {div.director}
                            </button>
                          )}
                        </p>
                      </div>

                      <div className="flex-1 flex items-center">
                        <p className="text-base text-muted-foreground">
                          <span className="font-semibold">Mission:</span>{' '}
                          {div.mission}
                        </p>
                      </div>
                    </div>

                    <div className="md:w-7/12">
                      <p className="text-base text-foreground mb-3 font-semibold">
                        Members:
                      </p>

                      <div className="flex flex-wrap gap-3">
                        {div.members.map((m) => (
                          <button
                            key={m}
                            onClick={() =>
                              navigate(`/articles?author=${encodeURIComponent(m)}`)
                            }
                            className="text-sm px-3 py-2 rounded-md border border-border bg-muted text-foreground transition-all duration-200 hover:scale-105 hover:border-primary hover:text-primary hover:shadow-[0_6px_18px_rgba(124,58,237,0.15)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Call to action */}
        <div className="text-center mt-24">
          <div className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-8 max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold text-foreground mb-4">
              Want to Join Our Mission?
            </h3>

            <p className="text-muted-foreground mb-6">
              We're always looking for passionate student researchers and science communicators to join our team.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                className="bg-transparent border border-border px-6 py-3 rounded-lg font-medium transition-colors hover:bg-muted"
                onClick={() => navigate('/submission')}
              >
                Apply to Write
              </button>

              <button
                className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3 rounded-lg font-medium transition-colors"
                onClick={() => navigate('/contact')}
              >
                Get Involved
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FoundersSection;