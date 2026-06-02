'use client';

import { useState } from 'react';
import styles from './page.module.css';

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      studentId: formData.get('studentId') as string,
      courseName: formData.get('courseName') as string,
      admin: formData.get('admin') as string,
    };

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to initiate checkout');
      }

      // Redirect to Ziina's hosted checkout page
      if (result.redirect_url) {
        window.location.href = result.redirect_url;
      } else {
        throw new Error('No redirect URL received from payment gateway');
      }
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <main className={styles.container}>
      <div className={`${styles.card} glass-panel`}>
        <div className={styles.header}>
          <h1 className={styles.title}>University Farewell</h1>
          <p className={styles.subtitle}>Secure your spot for the ultimate farewell event. Tickets are limited.</p>
        </div>

        <div className={styles.contentWrapper}>
          <div className={styles.column}>
            <form className={styles.form} onSubmit={handleSubmit}>
              {error && <div className={styles.error}>{error}</div>}

          <div className={styles.formGroup}>
            <label htmlFor="name" className={styles.label}>Full Name</label>
            <input 
              type="text" 
              id="name" 
              name="name" 
              className="input-field" 
              placeholder="John Doe" 
              required 
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.label}>Email Address</label>
            <input 
              type="email" 
              id="email" 
              name="email" 
              className="input-field" 
              placeholder="john@example.com" 
              required 
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="phone" className={styles.label}>Phone Number</label>
            <input 
              type="tel" 
              id="phone" 
              name="phone" 
              className="input-field" 
              placeholder="+971 50 123 4567" 
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="studentId" className={styles.label}>Student ID</label>
            <input 
              type="text" 
              id="studentId" 
              name="studentId" 
              className="input-field" 
              placeholder="Student ID" 
              required 
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="courseName" className={styles.label}>Course Name</label>
            <input 
              type="text" 
              id="courseName" 
              name="courseName" 
              className="input-field" 
              placeholder="Course Name" 
              required 
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="admin" className={styles.label}>Admin</label>
            <input 
              type="text" 
              id="admin" 
              name="admin" 
              className="input-field" 
              placeholder="Admin details" 
              required 
            />
          </div>

          <div className={styles.summary}>
            <span className={styles.summaryLabel}>Total to pay (VAT &amp; Charges)</span>
            <span className={styles.summaryValue}>AED 37.50</span>
          </div>

          <button 
            type="submit" 
            className="primary-btn" 
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Continue to Payment'}
            {!loading && (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            )}
          </button>
            </form>
          </div>

          <div className={styles.column}>
            <div className={styles.eventDetails}>
              <div className={styles.eventRow}>
                <svg className={styles.eventIcon} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <div className={styles.eventText}>
                  <span className={styles.eventLabel}>12th of June, 2026</span>
                  <span className={styles.eventSubtext}>5:30 PM to 9:30 PM (GMT+4)</span>
                </div>
              </div>

              <div className={styles.eventRow}>
                <svg className={styles.eventIcon} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                <div className={styles.eventText}>
                  <span className={styles.eventLabel}>Rasmat</span>
                  <span className={styles.eventSubtext}>
                    ABA Avenue - Warehouse No.8<br />
                    Al Qouz Ind.second - Al Quoz - Dubai
                  </span>
                  
                  <div className={styles.mapContainer}>
                    <iframe 
                      src="https://maps.google.com/maps?q=Rasmat,+ABA+Avenue,+Al+Quoz,+Dubai&t=&z=15&ie=UTF8&iwloc=&output=embed" 
                      height="200" 
                      allowFullScreen 
                      loading="lazy" 
                      referrerPolicy="no-referrer-when-downgrade"
                      title="Event Location Map"
                    ></iframe>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
