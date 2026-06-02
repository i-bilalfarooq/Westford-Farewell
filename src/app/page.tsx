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
    </main>
  );
}
