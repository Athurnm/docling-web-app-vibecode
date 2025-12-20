import React, { useState } from 'react';
import { X, Download, FileText, Table as TableIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function ReviewModal({ isOpen, onClose, data, onDownload, filename, fileUrl }) {
    // We can manage the merge state here or pass it up. 
    // For simplicity, let's manage a local state that defaults to false.
    const [merge, setMerge] = useState(false);
    // Requires importing React if not globally available, but normally in Vite + React 18 it works if config allows. 
    // Safer to just use useState from import if we edit headers, but let's try direct usage assuming 'import { useState } ...' was there or add it.

    // NOTE: ReviewModal didn't import useState. Let's fix that.

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="modal-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <motion.div
                    className="modal-content"
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                >
                    <div className="modal-header">
                        <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-primary" />
                            <h2>Review: {filename}</h2>
                        </div>
                        <button onClick={onClose} className="icon-btn">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="modal-body split-view">
                        {/* Left: PDF Preview */}
                        <div className="preview-pane pdf-pane">
                            <div className="pane-header">
                                <FileText size={16} /> Original PDF
                            </div>
                            <div className="pane-content" style={{ padding: 0 }}>
                                {fileUrl ? (
                                    <object
                                        data={fileUrl}
                                        type="application/pdf"
                                        width="100%"
                                        height="100%"
                                    >
                                        <p>Alternative text - include a link <a href={fileUrl}>to the PDF!</a></p>
                                    </object>
                                ) : (
                                    <div className="pdf-placeholder">
                                        <p>Preview not available</p>
                                    </div>
                                )}
                            </div>
                        </div>


                        {/* Right: Extracted Tables */}
                        <div className="preview-pane table-pane">
                            <div className="pane-header">
                                <TableIcon size={16} /> Extracted Data
                                <span className="badge">{data.length} Tables</span>
                            </div>
                            <div className="pane-content scrollable">
                                {data.map((table, idx) => (
                                    <div key={idx} className="table-preview-item">
                                        <h3>Table {idx + 1}</h3>
                                        <div className="table-wrapper">
                                            <table>
                                                <thead>
                                                    <tr>
                                                        {table.columns.map((col, cIdx) => (
                                                            <th key={cIdx}>{col}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {table.data.map((row, rIdx) => (
                                                        <tr key={rIdx}>
                                                            {row.map((cell, cIdx) => (
                                                                <td key={cIdx}>{cell}</td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="modal-footer">
                        <label className="flex items-center gap-2" style={{ marginRight: 'auto', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={merge}
                                onChange={(e) => setMerge(e.target.checked)}
                                style={{ width: 16, height: 16, cursor: 'pointer' }}
                            />
                            <span style={{ fontSize: 14, fontWeight: 500 }}>Merge tables with same headers</span>
                        </label>

                        <button className="btn-secondary" onClick={onClose}>Cancel</button>
                        <button className="btn-primary" onClick={() => onDownload(merge)}>
                            <Download size={18} /> Download CSV
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
