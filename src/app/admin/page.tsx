'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import { Html5QrcodeScanner } from 'html5-qrcode';
import styles from './page.module.css';

interface Ticket {
  id: string;
  created_at: string;
  name: string;
  email: string;
  phone: string;
  student_id: string;
  course_name: string;
  admin: string;
  payment_status: string;
  is_checked_in: boolean;
}

// Custom Select Component for better UI
const CustomSelect = ({ value, options, onChange, badgeClass }: any) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeLabel = options.find((o: any) => o.value === value)?.label || value;

  return (
    <div className={styles.customSelectWrapper} ref={wrapperRef}>
      <div 
        className={`${styles.badge} ${badgeClass}`} 
        onClick={() => setOpen(!open)}
      >
        {activeLabel}
      </div>
      {open && (
        <div className={styles.customSelectMenu}>
          {options.map((opt: any) => (
            <div 
              key={String(opt.value)} 
              className={styles.customSelectOption} 
              onClick={() => { 
                onChange(opt.value); 
                setOpen(false); 
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Scanner Modal Component
const ScannerModal = ({ onClose, password }: { onClose: () => void, password: string }) => {
  const [scanStatus, setScanStatus] = useState<'idle' | 'success' | 'error' | 'duplicate'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const scannerRef = useRef<any>(null);
  const isProcessingRef = useRef(false);
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    // We use the lower-level Html5Qrcode to get rid of the ugly built-in UI
    import('html5-qrcode').then(({ Html5Qrcode }) => {
      const html5QrCode = new Html5Qrcode("reader");
      scannerRef.current = html5QrCode;

      html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        onScanSuccess,
        () => {} // ignore errors (usually just "no qr code found")
      ).catch(err => {
        console.error("Camera start failed", err);
      });
    });

    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.stop()
            .then(() => scannerRef.current.clear())
            .catch(() => scannerRef.current.clear());
        } catch (e) {
          try { scannerRef.current.clear() } catch(e2) {}
        }
      }
    };
  }, []);

  const onScanSuccess = async (decodedText: string) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    
    try {
      if (scannerRef.current) {
        scannerRef.current.pause(true);
      }
    } catch(e) {}

    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${password}`
        },
        body: JSON.stringify({ ticketId: decodedText })
      });

      const data = await res.json();

      if (res.status === 200) {
        setScanStatus('success');
        setStatusMessage('Access Granted');
      } else if (res.status === 400) {
        setScanStatus('duplicate');
        setStatusMessage(data.error || 'Already Checked In');
      } else if (res.status === 404) {
        setScanStatus('error');
        setStatusMessage(data.error || 'Invalid Ticket');
      } else {
        setScanStatus('error');
        setStatusMessage(data.error || 'Server Error');
      }
    } catch (err) {
      setScanStatus('error');
      setStatusMessage('Network Error');
    }

    setTimeout(() => {
      setScanStatus('idle');
      isProcessingRef.current = false;
      try {
        if (scannerRef.current) {
          scannerRef.current.resume();
        }
      } catch(e) {}
    }, 2500);
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose}>&times;</button>
        <div className={styles.scannerWrapper}>
          <h2 style={{color: 'white', marginBottom: '1rem'}}>Ticket Scanner</h2>
          
          <div className={styles.scannerContainerWrapper}>
            {/* The actual video feed */}
            <div id="reader" className={styles.scannerContainer}></div>

            {/* The beautiful animated overlay */}
            {scanStatus !== 'idle' && (
              <div className={styles.statusOverlay}>
                {scanStatus === 'success' && (
                  <div className={`${styles.icon} ${styles.iconSuccess}`}>
                    <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                )}
                {(scanStatus === 'error' || scanStatus === 'duplicate') && (
                  <div className={`${styles.icon} ${styles.iconError}`}>
                    <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </div>
                )}
                <div className={styles.statusText}>{statusMessage}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


export default function AdminDashboard() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [qrCodeDataUrls, setQrCodeDataUrls] = useState<Record<string, string>>({});
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  
  const [ticketLimit, setTicketLimit] = useState<number>(200);
  const [isSavingLimit, setIsSavingLimit] = useState(false);

  // Filtering and Sorting States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPayment, setFilterPayment] = useState('all');
  const [filterCheckin, setFilterCheckin] = useState('all');
  const [sortBy, setSortBy] = useState('date_desc');

  const processedTickets = useMemo(() => {
    let result = [...tickets];

    // 1. Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t => 
        t.name.toLowerCase().includes(q) || 
        t.email.toLowerCase().includes(q) || 
        (t.student_id && t.student_id.toLowerCase().includes(q))
      );
    }

    // 2. Filter Payment
    if (filterPayment !== 'all') {
      result = result.filter(t => t.payment_status === filterPayment);
    }

    // 3. Filter Checkin
    if (filterCheckin !== 'all') {
      const isScanned = filterCheckin === 'scanned';
      result = result.filter(t => t.is_checked_in === isScanned);
    }

    // 4. Sort
    result.sort((a, b) => {
      if (sortBy === 'date_desc') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (sortBy === 'date_asc') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortBy === 'name_asc') {
        return a.name.localeCompare(b.name);
      }
      return 0;
    });

    return result;
  }, [tickets, searchQuery, filterPayment, filterCheckin, sortBy]);

  const exportToCSV = () => {
    if (processedTickets.length === 0) {
      alert('No tickets to export.');
      return;
    }

    const headers = ['Date', 'Name', 'Email', 'Phone', 'Student ID', 'Course', 'Admin', 'Payment Status', 'Check-in Status'];
    const csvRows = [headers.join(',')];

    processedTickets.forEach(ticket => {
      const row = [
        new Date(ticket.created_at).toLocaleDateString(),
        `"${ticket.name.replace(/"/g, '""')}"`,
        `"${ticket.email}"`,
        `"${ticket.phone}"`,
        `"${ticket.student_id || ''}"`,
        `"${ticket.course_name || ''}"`,
        `"${ticket.admin || ''}"`,
        ticket.payment_status.toUpperCase(),
        ticket.is_checked_in ? 'SCANNED' : 'NOT SCANNED'
      ];
      csvRows.push(row.join(','));
    });

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `tickets_export_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fetchSettings = async (pwd: string) => {
    try {
      const res = await fetch('/api/admin/settings', {
        headers: { 'Authorization': `Bearer ${pwd}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTicketLimit(data.limit || 200);
      }
    } catch (e) {
      console.error('Failed to fetch settings', e);
    }
  };

  const handleSaveLimit = async () => {
    if (!confirm(`Are you sure you want to set the ticket limit to ${ticketLimit}?`)) return;
    setIsSavingLimit(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${password}` },
        body: JSON.stringify({ limit: ticketLimit })
      });
      if (!res.ok) {
        alert('Failed to save limit');
      } else {
        alert('Ticket limit updated successfully!');
      }
    } catch (e) {
      console.error(e);
      alert('Error saving limit');
    } finally {
      setIsSavingLimit(false);
    }
  };

  const fetchTickets = async (pwd: string) => {
    try {
      const res = await fetch('/api/admin/tickets', {
        headers: { 'Authorization': `Bearer ${pwd}` }
      });
      if (!res.ok) {
        throw new Error('Invalid Password');
      }
      const data = await res.json();
      setTickets(data.tickets);
      setIsAuthenticated(true);
      sessionStorage.setItem('adminPassword', pwd);
      fetchSettings(pwd);
    } catch (err: any) {
      setError(err.message || 'Failed to load tickets');
      setIsAuthenticated(false);
      sessionStorage.removeItem('adminPassword');
    } finally {
      setLoading(false);
    }
  };

  // Check for saved password on mount
  useEffect(() => {
    const saved = sessionStorage.getItem('adminPassword');
    if (saved) {
      setPassword(saved);
      fetchTickets(saved);
    }
  }, []);

  // Poll for updates every 5 seconds if authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      fetchTickets(password);
    }, 5000);
    return () => clearInterval(interval);
  }, [isAuthenticated, password]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await fetchTickets(password);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('adminPassword');
    setIsAuthenticated(false);
    setPassword('');
    setTickets([]);
  };

  // Generate QR codes
  useEffect(() => {
    if (!isAuthenticated) return;
    tickets.forEach(async (ticket) => {
      if (ticket.payment_status === 'completed' && !qrCodeDataUrls[ticket.id]) {
        try {
          const url = await QRCode.toDataURL(ticket.id, {
            width: 150, margin: 1, color: { dark: '#000000', light: '#ffffff' }
          });
          setQrCodeDataUrls(prev => ({ ...prev, [ticket.id]: url }));
        } catch (e) {
          console.error(e);
        }
      }
    });
  }, [tickets, isAuthenticated, qrCodeDataUrls]);

  const updateTicket = async (id: string, updates: any) => {
    setTickets(tickets.map(t => t.id === id ? { ...t, ...updates } : t));
    try {
      await fetch(`/api/admin/tickets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${password}` },
        body: JSON.stringify(updates)
      });
    } catch (err) {
      console.error(err);
    }
  };

  const deleteTicket = async (id: string) => {
    if (!confirm('Are you sure you want to delete this ticket?')) return;
    setTickets(tickets.filter(t => t.id !== id));
    try {
      await fetch(`/api/admin/tickets/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${password}` }
      });
    } catch (err) {
      console.error(err);
    }
  };

  const openLargeQr = async (ticket: Ticket) => {
    try {
      const url = await QRCode.toDataURL(ticket.id, {
        width: 400, margin: 2, color: { dark: '#000000', light: '#ffffff' }
      });
      setSelectedTicket({ ...ticket, qrUrl: url } as any);
    } catch (err) {
      console.error(err);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className={styles.container}>
        <form onSubmit={handleLogin} className={styles.loginCard}>
          <h2 style={{color: 'white', marginBottom: '1rem'}}>Admin Dashboard Login</h2>
          {error && <p style={{color: '#ef4444', marginBottom: '1rem', fontSize: '0.875rem'}}>{error}</p>}
          <input 
            type="password" 
            className="input-field" 
            placeholder="Enter Admin Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit" className="primary-btn" style={{marginTop: '1rem'}} disabled={loading}>
            {loading ? 'Authenticating...' : 'Login'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Ticketing Dashboard</h1>
        <div className={styles.headerActions}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#1f2937', padding: '0.5rem', borderRadius: '0.5rem' }}>
            <label style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Ticket Limit:</label>
            <input 
              type="number" 
              value={ticketLimit} 
              onChange={(e) => setTicketLimit(parseInt(e.target.value) || 0)}
              style={{ width: '80px', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', border: '1px solid #374151', background: '#111827', color: 'white' }}
            />
            <button 
              onClick={handleSaveLimit}
              disabled={isSavingLimit}
              style={{ padding: '0.25rem 0.75rem', background: '#4f46e5', color: 'white', borderRadius: '0.25rem', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}
            >
              {isSavingLimit ? 'Saving...' : 'Save'}
            </button>
          </div>
          <button className="primary-btn" onClick={() => setIsScannerOpen(true)}>
            Open QR Scanner
          </button>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </div>

      <div className={styles.controlsContainer}>
        <input 
          type="text" 
          placeholder="Search by name, email, or ID..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
        />
        
        <select 
          value={filterPayment} 
          onChange={(e) => setFilterPayment(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="all">All Payments</option>
          <option value="completed">Paid Only</option>
          <option value="pending">Pending Only</option>
        </select>

        <select 
          value={filterCheckin} 
          onChange={(e) => setFilterCheckin(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="all">All Check-ins</option>
          <option value="scanned">Checked In</option>
          <option value="not_scanned">Not Checked In</option>
        </select>

        <select 
          value={sortBy} 
          onChange={(e) => setSortBy(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="date_desc">Newest First</option>
          <option value="date_asc">Oldest First</option>
          <option value="name_asc">Name (A-Z)</option>
        </select>

        <button 
          onClick={exportToCSV}
          style={{ padding: '0.5rem 1rem', background: '#10b981', color: 'white', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, marginLeft: 'auto' }}
        >
          Export CSV
        </button>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Date</th>
              <th className={styles.th}>Attendee</th>
              <th className={styles.th}>Contact</th>
              <th className={styles.th}>Payment Status</th>
              <th className={styles.th}>Check-in</th>
              <th className={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {processedTickets.length === 0 ? (
              <tr>
                <td colSpan={6} className={styles.emptyState}>No tickets found.</td>
              </tr>
            ) : (
              processedTickets.map((ticket) => (
                <tr key={ticket.id} className={styles.tr}>
                  <td className={styles.td}>
                    {new Date(ticket.created_at).toLocaleDateString()}
                  </td>
                  <td className={styles.td}>
                    <div style={{fontWeight: 600}}>{ticket.name}</div>
                    <div style={{fontSize: '0.8rem', color: '#9ca3af'}}>ID: {ticket.student_id || 'N/A'}</div>
                    <div style={{fontSize: '0.8rem', color: '#9ca3af'}}>Course: {ticket.course_name || 'N/A'}</div>
                  </td>
                  <td className={styles.td}>
                    <div>{ticket.email}</div>
                    <div style={{fontSize: '0.8rem', color: '#9ca3af'}}>{ticket.phone}</div>
                    <div style={{fontSize: '0.8rem', color: '#9ca3af', marginTop: '0.2rem'}}>Admin: <span style={{color: 'white'}}>{ticket.admin || 'N/A'}</span></div>
                  </td>
                  <td className={styles.td}>
                    <CustomSelect 
                      value={ticket.payment_status}
                      options={[{value: 'pending', label: 'PENDING'}, {value: 'completed', label: 'COMPLETED'}]}
                      onChange={(val: string) => updateTicket(ticket.id, { payment_status: val })}
                      badgeClass={ticket.payment_status === 'completed' ? styles.badgeCompleted : styles.badgePending}
                    />
                  </td>
                  <td className={styles.td}>
                    <CustomSelect 
                      value={ticket.is_checked_in}
                      options={[{value: false, label: 'NOT SCANNED'}, {value: true, label: 'SCANNED'}]}
                      onChange={(val: boolean) => updateTicket(ticket.id, { is_checked_in: val })}
                      badgeClass={ticket.is_checked_in ? styles.badgeTrue : styles.badgeFalse}
                    />
                  </td>
                  <td className={styles.td}>
                    <div className={styles.actionsContainer}>
                      {ticket.payment_status === 'completed' && qrCodeDataUrls[ticket.id] && (
                        <img 
                          src={qrCodeDataUrls[ticket.id]} 
                          className={styles.inlineQr} 
                          alt="QR" 
                          onClick={() => openLargeQr(ticket)}
                          title="Click to enlarge"
                        />
                      )}
                      <button className={styles.deleteBtn} onClick={() => deleteTicket(ticket.id)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isScannerOpen && (
        <ScannerModal onClose={() => setIsScannerOpen(false)} password={password} />
      )}

      {selectedTicket && (
        <div className={styles.modalOverlay} onClick={() => setSelectedTicket(null)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={() => setSelectedTicket(null)}>&times;</button>
            <h3 style={{color: 'white', marginBottom: '0.5rem'}}>{selectedTicket.name}'s Ticket</h3>
            <p style={{color: '#9ca3af', fontSize: '0.875rem'}}>Ticket ID: {selectedTicket.id}</p>
            {(selectedTicket as any).qrUrl && (
              <img src={(selectedTicket as any).qrUrl} alt="QR Code" className={styles.qrImage} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
