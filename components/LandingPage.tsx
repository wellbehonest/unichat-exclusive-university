import React from 'react';
import { MessageSquare, Users, Shield, Sparkles, Lock, Zap, Heart, ArrowRight } from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  return (
    <div className="min-h-screen bg-dark-bg bg-grid-dark-surface/[0.2] relative overflow-hidden">
      {/* Background gradient effect */}
      <div className="absolute pointer-events-none inset-0 flex items-center justify-center bg-dark-bg [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>
      
      {/* Header */}
      <header className="relative z-10 p-4 md:p-6">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <img 
              src="/logo.svg" 
              alt="LynZo Logo" 
              className="h-10 md:h-12 w-auto mr-3"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <MessageSquare className="mr-2 text-brand-primary hidden" />
            <h1 className="text-xl md:text-2xl font-bold text-white" style={{ fontFamily: "'Momo Trust Display', sans-serif" }}>LynZo</h1>
          </div>
          <button
            onClick={onGetStarted}
            className="px-4 md:px-6 py-2 bg-brand-primary hover:bg-brand-secondary text-white rounded-full font-semibold transition-all duration-300 text-sm md:text-base"
          >
            Sign In
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 container mx-auto px-4 py-12 md:py-20">
        <div className="max-w-4xl mx-auto text-center space-y-6 md:space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center space-x-2 bg-brand-primary/10 border border-brand-primary/30 rounded-full px-4 py-2 text-brand-primary text-sm">
            <Sparkles size={16} />
            <span>Exclusive University Community</span>
          </div>

          {/* Main Heading */}
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white leading-tight">
            Connect with Your
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-brand-secondary">
              Campus Community
            </span>
          </h2>

          {/* Description */}
          <p className="text-lg md:text-xl text-dark-text-secondary max-w-2xl mx-auto px-4">
            LynZo is an exclusive chat platform designed for university students. 
            Connect anonymously, make new friends, and engage in meaningful conversations 
            with verified students from your campus.
          </p>

          {/* CTA Button */}
          <div className="pt-4">
            <button
              onClick={onGetStarted}
              className="group inline-flex items-center space-x-2 px-8 py-4 bg-brand-primary hover:bg-brand-secondary text-white rounded-full font-bold text-lg transition-all duration-300 shadow-lg hover:shadow-brand-primary/50 hover:scale-105"
            >
              <span>Get Started</span>
              <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 md:gap-8 max-w-2xl mx-auto pt-8">
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-white">100%</div>
              <div className="text-sm text-dark-text-secondary">Verified</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-white">Safe</div>
              <div className="text-sm text-dark-text-secondary">& Secure</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-white">24/7</div>
              <div className="text-sm text-dark-text-secondary">Active</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 container mx-auto px-4 py-12 md:py-20">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-3xl md:text-4xl font-bold text-white text-center mb-12">
            Why Choose LynZo?
          </h3>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {/* Feature 1 */}
            <div className="bg-dark-card/50 backdrop-blur-sm border border-dark-surface/50 rounded-2xl p-6 hover:border-brand-primary/50 transition-all duration-300 hover:scale-105">
              <div className="w-12 h-12 bg-brand-primary/20 rounded-xl flex items-center justify-center mb-4">
                <Shield className="text-brand-primary" size={24} />
              </div>
              <h4 className="text-xl font-bold text-white mb-2">Verified Students Only</h4>
              <p className="text-dark-text-secondary">
                Admin-approved registration ensures you only connect with real university students.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-dark-card/50 backdrop-blur-sm border border-dark-surface/50 rounded-2xl p-6 hover:border-brand-primary/50 transition-all duration-300 hover:scale-105">
              <div className="w-12 h-12 bg-brand-primary/20 rounded-xl flex items-center justify-center mb-4">
                <Users className="text-brand-primary" size={24} />
              </div>
              <h4 className="text-xl font-bold text-white mb-2">Random Matching</h4>
              <p className="text-dark-text-secondary">
                Get matched with random students for spontaneous and exciting conversations.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-dark-card/50 backdrop-blur-sm border border-dark-surface/50 rounded-2xl p-6 hover:border-brand-primary/50 transition-all duration-300 hover:scale-105">
              <div className="w-12 h-12 bg-brand-primary/20 rounded-xl flex items-center justify-center mb-4">
                <Lock className="text-brand-primary" size={24} />
              </div>
              <h4 className="text-xl font-bold text-white mb-2">Privacy First</h4>
              <p className="text-dark-text-secondary">
                Your privacy matters. Chat anonymously and control what you share.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-dark-card/50 backdrop-blur-sm border border-dark-surface/50 rounded-2xl p-6 hover:border-brand-primary/50 transition-all duration-300 hover:scale-105">
              <div className="w-12 h-12 bg-brand-primary/20 rounded-xl flex items-center justify-center mb-4">
                <Zap className="text-brand-primary" size={24} />
              </div>
              <h4 className="text-xl font-bold text-white mb-2">Instant Connection</h4>
              <p className="text-dark-text-secondary">
                No waiting around. Get matched instantly and start chatting right away.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-dark-card/50 backdrop-blur-sm border border-dark-surface/50 rounded-2xl p-6 hover:border-brand-primary/50 transition-all duration-300 hover:scale-105">
              <div className="w-12 h-12 bg-brand-primary/20 rounded-xl flex items-center justify-center mb-4">
                <Heart className="text-brand-primary" size={24} />
              </div>
              <h4 className="text-xl font-bold text-white mb-2">Safe Environment</h4>
              <p className="text-dark-text-secondary">
                Report and block features keep the community safe and respectful.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-dark-card/50 backdrop-blur-sm border border-dark-surface/50 rounded-2xl p-6 hover:border-brand-primary/50 transition-all duration-300 hover:scale-105">
              <div className="w-12 h-12 bg-brand-primary/20 rounded-xl flex items-center justify-center mb-4">
                <MessageSquare className="text-brand-primary" size={24} />
              </div>
              <h4 className="text-xl font-bold text-white mb-2">Rich Messaging</h4>
              <p className="text-dark-text-secondary">
                Share text, GIFs, and emojis to express yourself in every conversation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 container mx-auto px-4 py-12 md:py-20">
        <div className="max-w-4xl mx-auto bg-gradient-to-r from-brand-primary to-brand-secondary rounded-3xl p-8 md:p-12 text-center">
          <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Connect?
          </h3>
          <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">
            Join thousands of students already making connections on LynZo. 
            Sign up now and start your first conversation today!
          </p>
          <button
            onClick={onGetStarted}
            className="group inline-flex items-center space-x-2 px-8 py-4 bg-white text-brand-primary rounded-full font-bold text-lg transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
          >
            <span>Join LynZo Now</span>
            <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-dark-surface/50 mt-12">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-dark-text-secondary text-sm">
            <p>&copy; 2025 LynZo. All rights reserved.</p>
            <p className="mt-2">Exclusive university chat platform for verified students.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
