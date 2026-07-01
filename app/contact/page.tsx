import Link from 'next/link';
import { Mail, Bug, Building2, ArrowLeft } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export default function ContactPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-24 pb-20">
        <div className="max-w-3xl mx-auto px-4">
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          <h1 className="text-3xl font-bold mb-2">Get in Touch</h1>
          <p className="text-text-secondary mb-12">
            Have a question, found a bug, or need help with your account?
          </p>

          <div className="grid sm:grid-cols-3 gap-6">
            <div className="bg-surface border border-border rounded-xl p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-6 h-6 text-accent" />
              </div>
              <h3 className="font-semibold mb-2">Support</h3>
              <p className="text-text-secondary text-sm mb-4">
                For account, billing, or technical issues.
              </p>
              <a
                href="mailto:zerohisoka0@gmail.com"
                className="text-accent hover:text-accent-hover text-sm"
              >
                zerohisoka0@gmail.com
              </a>
            </div>

            <div className="bg-surface border border-border rounded-xl p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <Bug className="w-6 h-6 text-accent" />
              </div>
              <h3 className="font-semibold mb-2">Bug Reports</h3>
              <p className="text-text-secondary text-sm mb-4">
                Found a bug? Report it on GitHub.
              </p>
              <a
                href="#"
                className="text-accent hover:text-accent-hover text-sm"
              >
                GitHub Issues →
              </a>
            </div>

            <div className="bg-surface border border-border rounded-xl p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-6 h-6 text-accent" />
              </div>
              <h3 className="font-semibold mb-2">Agency Inquiries</h3>
              <p className="text-text-secondary text-sm mb-4">
                Volume pricing or white-label questions.
              </p>
              <a
                href="mailto:zerohisoka0@gmail.com"
                className="text-accent hover:text-accent-hover text-sm"
              >
                zerohisoka0@gmail.com
              </a>
            </div>
          </div>

          <p className="text-center text-text-muted text-sm mt-12">
            We typically respond within 24 hours on business days.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
