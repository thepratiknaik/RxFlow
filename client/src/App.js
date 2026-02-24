import React from "react";

const handleSubmit = (event) => {
  event.preventDefault();
  const formData = {
    pharmacy: document.getElementById("name").value,
    contactPerson: document.getElementById("contact-person").value,
    email: document.getElementById("email").value,
    phone: document.getElementById("phone").value,
    message: document.getElementById("message").value,
  };

  console.log("Demo Request Submitted:", formData);
  alert("Thank you! We will contact you shortly to schedule your demo.");
  event.target.reset();
};

const App = () => {
  return (
    <>
      <header>
        <div className="header-container">
          <a href="#" className="logo">
            RxFlow
          </a>
          <nav>
            <a href="#how-it-works">How It Works</a>
            <a href="#features">Features</a>
            <a href="#services">Services</a>
            <a href="#testimonials">Testimonials</a>
            <a href="#contact">Contact</a>
            <a href="#contact" className="cta-demo">
              Request Demo
            </a>
          </nav>
        </div>
      </header>

      <section className="hero">
        <div className="hero-content">
          <h1>Modern Pharmacy Management, Reimagined</h1>
          <p>
            RxFlow streamlines prescription workflows from intake to pickup,
            centralizing patient data, prescriber records, and drug inventory.
            Designed for independent and community pharmacies to boost
            efficiency, control costs, and ensure accountability.
          </p>
          <a href="#contact" className="cta-demo">
            Get Started Today
          </a>
          <a href="#how-it-works" className="cta-secondary">
            Learn More
          </a>
        </div>
      </section>

      <section className="how-it-works" id="how-it-works">
        <div className="how-it-works-container">
          <h2 className="section-title">How RxFlow Works</h2>
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">1</div>
              <h3>Prescription Intake</h3>
              <p>
                Receive prescriptions seamlessly from patients and
                e-prescription systems. Centralize all prescription data with
                integrated drug information.
              </p>
            </div>
            <div className="step-card">
              <div className="step-number">2</div>
              <h3>Inventory Management</h3>
              <p>
                Track lot numbers and expiry dates in real-time. Get automatic
                low-stock alerts and optimize your pharmacy inventory
                efficiently.
              </p>
            </div>
            <div className="step-card">
              <div className="step-number">3</div>
              <h3>Patient Pickup &amp; Audit</h3>
              <p>
                Enable safe patient pickups with role-based access controls.
                Maintain complete audit logs for accountability and compliance.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="features" id="features">
        <div className="features-container">
          <h2 className="section-title">Powerful Features</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">📋</div>
              <h3>Complete Workflow Management</h3>
              <p>
                From prescription intake to patient pickup, manage the entire
                pharmacy workflow in one intuitive platform.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">💾</div>
              <h3>Centralized Data Hub</h3>
              <p>
                Patient profiles, prescriber records, and drug data all in one
                secure location. Easy access, better decisions.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Smart Inventory Control</h3>
              <p>
                Track lot numbers, expiry dates, and stock levels. Automatic
                alerts prevent stockouts and waste.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔐</div>
              <h3>Role-Based Access Control</h3>
              <p>
                Assign precise permissions to staff. Ensure only authorized
                personnel access sensitive pharmacy data.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📱</div>
              <h3>E-Prescription Integration</h3>
              <p>
                Seamlessly receive and process e-prescriptions from healthcare
                providers and external systems.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">✅</div>
              <h3>Complete Audit Trails</h3>
              <p>
                Every action logged for full accountability. Meet regulatory
                requirements with comprehensive audit logs.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="comparison">
        <div className="comparison-container">
          <h2 className="section-title">Our Value Proposition</h2>
          <div className="services-grid" style={{ marginTop: "2rem" }}>
            <div className="service-box">
              <h3>🎯 Mission-Critical Efficiency</h3>
              <p>
                Automate prescription workflows end-to-end. Reduce manual entry,
                eliminate errors, and process prescriptions faster than ever
                before.
              </p>
            </div>
            <div className="service-box">
              <h3>📦 Complete Inventory Control</h3>
              <p>
                Track lot numbers and expiry dates with precision. Receive
                automatic low-stock alerts and prevent costly waste and
                stockouts.
              </p>
            </div>
            <div className="service-box">
              <h3>🔗 Modern Integration Ready</h3>
              <p>
                Seamlessly connect with e-prescription systems and external data
                sources. Built for interoperability from the ground up.
              </p>
            </div>
            <div className="service-box">
              <h3>📊 Single Source of Truth</h3>
              <p>
                Centralize patient, prescriber, and drug data. End fragmented
                systems and gain complete visibility across operations.
              </p>
            </div>
            <div className="service-box">
              <h3>✅ Compliance &amp; Accountability</h3>
              <p>
                Automatic audit logs capture every action. Meet regulatory
                requirements and demonstrate accountability to inspectors and
                auditors.
              </p>
            </div>
            <div className="service-box">
              <h3>🛡️ Enterprise-Grade Security</h3>
              <p>
                Role-based access controls and secure cloud infrastructure
                protect your pharmacy data 24/7 with enterprise-grade
                encryption.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="services" id="services">
        <div className="services-container">
          <h2 className="section-title">Our Service Offerings</h2>
          <div className="services-grid">
            <div className="service-box">
              <h3>Core Platform Access</h3>
              <p>
                Full access to RxFlow's prescription management and inventory
                tracking system with cloud-based storage and 24/7 support.
              </p>
              <ul className="service-features">
                <li>Prescription workflow automation</li>
                <li>Inventory &amp; lot tracking</li>
                <li>Patient &amp; prescriber profiles</li>
                <li>Cloud-based data storage</li>
              </ul>
            </div>
            <div className="service-box">
              <h3>Integration Services</h3>
              <p>
                Seamless connectivity with your existing pharmacy systems and
                external e-prescription networks for uninterrupted operations.
              </p>
              <ul className="service-features">
                <li>E-prescription system integration</li>
                <li>Legacy system data migration</li>
                <li>Third-party API connections</li>
                <li>Custom workflow adaptations</li>
              </ul>
            </div>
            <div className="service-box">
              <h3>Training &amp; Support</h3>
              <p>
                Comprehensive onboarding, staff training, and ongoing support to
                ensure your team maximizes RxFlow's capabilities.
              </p>
              <ul className="service-features">
                <li>Staff training programs</li>
                <li>Documentation &amp; guides</li>
                <li>Priority technical support</li>
                <li>Quarterly performance reviews</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="security">
        <div className="security-content">
          <div className="security-item">
            <h4>🔐 Role-Based Access Control</h4>
            <p>
              Granular permissions ensure only authorized staff access sensitive
              prescription and patient data.
            </p>
          </div>
          <div className="security-item">
            <h4>📋 Complete Audit Logs</h4>
            <p>
              Every transaction logged automatically. Full accountability and
              regulatory compliance for your pharmacy.
            </p>
          </div>
          <div className="security-item">
            <h4>☁️ Secure Cloud Infrastructure</h4>
            <p>
              Enterprise-grade encryption and secure data storage. Your pharmacy
              data is protected 24/7.
            </p>
          </div>
        </div>
      </section>

      <section className="testimonials" id="testimonials">
        <div className="testimonials-container">
          <h2 className="section-title">What Our Clients Say</h2>
          <div className="testimonials-grid">
            <div className="testimonial-card">
              <p className="testimonial-text">
                RxFlow completely transformed how we manage prescriptions. Our
                inventory is now accurate, and we've cut down processing time by
                40%.
              </p>
              <div className="testimonial-author">
                <div className="author-avatar">SJ</div>
                <div className="author-info">
                  <h4>Sarah Johnson</h4>
                  <span className="author-role">Pharmacy Manager</span>
                  <p>Green Valley Community Pharmacy, Colorado</p>
                </div>
              </div>
            </div>
            <div className="testimonial-card">
              <p className="testimonial-text">
                The compliance and audit logs give us peace of mind. Our
                regulators love the transparency, and our staff appreciates the
                simplicity.
              </p>
              <div className="testimonial-author">
                <div className="author-avatar">MD</div>
                <div className="author-info">
                  <h4>Michael Davis</h4>
                  <span className="author-role">Pharmacist &amp; Owner</span>
                  <p>Downtown Independent Pharmacy, Texas</p>
                </div>
              </div>
            </div>
            <div className="testimonial-card">
              <p className="testimonial-text">
                From integration to go-live, RxFlow's team was incredible. The
                e-prescription integration saved us hours every day. Highly
                recommended!
              </p>
              <div className="testimonial-author">
                <div className="author-avatar">RP</div>
                <div className="author-info">
                  <h4>Rachel Patel</h4>
                  <span className="author-role">Operations Director</span>
                  <p>Harbor Health Pharmacy Group, California</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="contact" id="contact">
        <div className="contact-container">
          <h2 className="section-title">Get Your Demo</h2>
          <p className="section-subtitle">
            Ready to transform your pharmacy? Request a personalized demo and
            see RxFlow in action.
          </p>
          <form className="contact-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="name">Pharmacy Name *</label>
              <input type="text" id="name" name="name" required />
            </div>
            <div className="form-group">
              <label htmlFor="contact-person">Contact Person *</label>
              <input
                type="text"
                id="contact-person"
                name="contact-person"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email Address *</label>
              <input type="email" id="email" name="email" required />
            </div>
            <div className="form-group">
              <label htmlFor="phone">Phone Number</label>
              <input type="tel" id="phone" name="phone" />
            </div>
            <div className="form-group">
              <label htmlFor="message">Tell us about your pharmacy *</label>
              <textarea
                id="message"
                name="message"
                required
                placeholder="Staff size, current challenges, what you'd like to improve..."
              />
            </div>
            <button type="submit" className="submit-btn">
              Request Demo
            </button>
          </form>
        </div>
      </section>

      <section className="team">
        <div className="team-container">
          <h2 className="section-title">Meet Our Team</h2>
          <p className="section-subtitle">
            Expert professionals dedicated to transforming pharmacy management
          </p>
          <div className="team-grid">
            <div className="team-member">
              <div className="member-avatar">👨‍💼</div>
              <div className="member-info">
                <h3>Alex Martinez</h3>
                <p>CEO &amp; Founder</p>
                <p className="member-bio">
                  Former pharmacy operations director with 15+ years in
                  healthcare tech. Passionate about solving real pharmacy
                  challenges.
                </p>
              </div>
            </div>
            <div className="team-member">
              <div className="member-avatar">👩‍💻</div>
              <div className="member-info">
                <h3>Emma Chen</h3>
                <p>CTO &amp; Co-Founder</p>
                <p className="member-bio">
                  Full-stack developer specializing in healthcare systems. Built
                  RxFlow's architecture from the ground up.
                </p>
              </div>
            </div>
            <div className="team-member">
              <div className="member-avatar">👩‍⚕️</div>
              <div className="member-info">
                <h3>Dr. Lisa Anderson</h3>
                <p>Head of Product</p>
                <p className="member-bio">
                  Licensed pharmacist and product strategist. Ensures RxFlow
                  meets real pharmacy practitioners' needs.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer>
        <div className="footer-container">
          <div className="footer-section">
            <h4>RxFlow</h4>
            <p>
              Modern pharmacy management for independent and community
              pharmacies.
            </p>
          </div>
          <div className="footer-section">
            <h4>Product</h4>
            <ul>
              <li>
                <a href="#features">Features</a>
              </li>
              <li>
                <a href="#services">Services</a>
              </li>
              <li>
                <a href="#how-it-works">How It Works</a>
              </li>
              <li>
                <a href="#">Pricing</a>
              </li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Company</h4>
            <ul>
              <li>
                <a href="#">About Us</a>
              </li>
              <li>
                <a href="#">Blog</a>
              </li>
              <li>
                <a href="#">Careers</a>
              </li>
              <li>
                <a href="#contact">Contact</a>
              </li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Legal</h4>
            <ul>
              <li>
                <a href="#">Privacy Policy</a>
              </li>
              <li>
                <a href="#">Terms of Service</a>
              </li>
              <li>
                <a href="#">Compliance</a>
              </li>
              <li>
                <a href="#">Security</a>
              </li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>
            © 2026 RxFlow. All rights reserved. | Transforming Pharmacy
            Operations Worldwide
          </p>
        </div>
      </footer>
    </>
  );
};

export default App;
