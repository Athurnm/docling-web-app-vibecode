import { useState, useRef } from 'react';
import { Upload, FileText, Settings, Home, LayoutDashboard, Command, XCircle, CheckCircle2, Loader2, Play, PanelLeftClose, ChevronLeft } from 'lucide-react';
import './index.css';
import { ReviewModal } from './ReviewModal';
import { LoadingGame } from './LoadingGame';
import Logo from './assets/logo.svg';

function App() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, processing, review, done, error
  const [tablesData, setTablesData] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const abortControllerRef = useRef(null);

  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef(null);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      handleUpload(selectedFile);
    }
  };

  const handleUpload = async (selectedFile) => {
    const fileToUpload = selectedFile || file;
    if (!fileToUpload) return;

    setStatus('processing');
    setErrorMsg(null);
    setTablesData([]);
    setElapsedTime(0);

    // Start Timer
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    // Create abort controller for cancel
    abortControllerRef.current = new AbortController();

    const formData = new FormData();
    formData.append('file', fileToUpload);

    try {
      // 1. Initiate Upload
      const response = await fetch('http://localhost:8080/extract-table', {
        method: 'POST',
        body: formData,
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const initData = await response.json();
      const jobId = initData.job_id;

      // 2. Poll for status
      const pollInterval = setInterval(async () => {
        try {
          // Check if cancelled
          if (abortControllerRef.current.signal.aborted) {
            clearInterval(pollInterval);
            return;
          }

          const statusRes = await fetch(`http://localhost:8080/job/${jobId}`);
          if (!statusRes.ok) throw new Error("Status check failed");

          const jobData = await statusRes.json();

          if (jobData.status === 'completed') {
            clearInterval(pollInterval);
            clearInterval(timerRef.current);
            setTablesData(jobData.tables || []);
            setStatus('review');
            setIsModalOpen(true);
          } else if (jobData.status === 'failed') {
            clearInterval(pollInterval);
            throw new Error("Processing failed on server");
          }
          // If processing, continue polling
        } catch (err) {
          clearInterval(pollInterval);
          clearInterval(timerRef.current);
          setStatus('error');
          setErrorMsg(err.message);
        }
      }, 2000);

      // Store poll interval to clear on cancel if we wanted to be robust, 
      // but abort signal check inside helps. We can also ref is needed.

    } catch (err) {
      clearInterval(timerRef.current);
      if (err.name === 'AbortError') {
        setStatus('idle');
        console.log('Upload cancelled');
      } else {
        console.error(err);
        setStatus('error');
        setErrorMsg(err.message);
      }
    }
  };

  const cancelProcessing = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setStatus('idle');
    setFile(null);
    setElapsedTime(0);
  };

  const handleDownload = async (shouldMerge = false) => {
    try {
      const response = await fetch('http://localhost:8080/generate-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tables: tablesData, merge: shouldMerge }),
      });

      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${file.name.replace('.pdf', '')}_tables.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setIsModalOpen(false);
      setStatus('done');
    } catch (e) {
      alert('Error downloading CSV: ' + e.message);
    }
  };

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="brand">
          <img src={Logo} alt="Logo" style={{ width: 32, height: 32 }} />
          {!isSidebarCollapsed && <span>Matchmade</span>}
        </div>
        <nav style={{ flex: 1 }}>
          <div className="nav-item">
            <Home size={20} /> {!isSidebarCollapsed && "Home"}
          </div>
          <div className="nav-item active">
            <LayoutDashboard size={20} /> {!isSidebarCollapsed && "Data Source"}
          </div>
          <div className="nav-item">
            <Command size={20} /> {!isSidebarCollapsed && "Workflow"}
          </div>
          <div className="nav-item">
            <Settings size={20} /> {!isSidebarCollapsed && "Settings"}
          </div>
        </nav>

        <div
          className="toggle-btn"
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        >
          <ChevronLeft size={16} />
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="header">
          <div>
            <h1>Data Source</h1>
            <p style={{ color: 'var(--text-scnd)' }}>Upload documents to extract structured data.</p>
          </div>
          <button className="btn-primary" onClick={() => document.getElementById('file-input').click()}>
            <Upload size={18} /> New Upload
          </button>
        </header>

        {/* Status Cards or Upload Area */}
        <div className="content-area">
          {status === 'idle' || status === 'done' || status === 'error' ? (
            <div
              className="upload-card"
              onClick={() => document.getElementById('file-input').click()}
            >
              <input
                type="file"
                id="file-input"
                accept=".pdf"
                onChange={handleFileChange}
                hidden
              />
              <div className="upload-icon">
                <Upload size={48} strokeWidth={1} />
              </div>
              <h3 style={{ margin: '0 0 8px 0' }}>Click to upload or drag and drop</h3>
              <p style={{ color: 'var(--text-scnd)', margin: 0 }}>PDF files only (max 10MB)</p>
            </div>
          ) : null}

          {/* Processing State */}
          {status === 'processing' && (
            <div style={{
              marginTop: 40,
              textAlign: 'center',
              background: 'white',
              padding: 40,
              borderRadius: 16,
              border: '1px solid var(--border)'
            }}>
              <div style={{ maxWidth: 600, margin: '0 auto 32px auto' }}>
                <LoadingGame />
              </div>

              <Loader2 size={40} className="text-primary animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
              <h3 style={{ marginTop: 16 }}>Processing Document...</h3>
              <div style={{ fontSize: '24px', fontWeight: 'bold', margin: '10px 0', color: 'var(--primary)' }}>
                {formatTime(elapsedTime)}
              </div>
              <p style={{ color: 'var(--text-scnd)' }}>
                {elapsedTime < 5 ? "Initializing Docling..." :
                  elapsedTime < 15 ? "Analyzing document structure..." :
                    elapsedTime < 30 ? "Extracting tables and data..." :
                      "Finalizing conversion..."}
              </p>

              <button onClick={cancelProcessing} className="btn-danger" style={{ marginTop: 20 }}>
                Cancel
              </button>
            </div>
          )}

          {/* Success/Error Messages */}
          {status === 'done' && (
            <div style={{ marginTop: 24, padding: 16, background: '#ecfdf5', color: '#047857', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
              <CheckCircle2 size={20} /> Extraction complete! Check your downloads.
            </div>
          )}

          {status === 'error' && (
            <div style={{ marginTop: 24, padding: 16, background: '#fef2f2', color: '#b91c1c', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
              <XCircle size={20} /> Error: {errorMsg}
            </div>
          )}
        </div>

        {/* Review Modal */}
        <ReviewModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          data={tablesData}
          filename={file?.name}
          fileUrl={file ? URL.createObjectURL(file) : null}
          onDownload={handleDownload}
        />

      </main>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

export default App;
