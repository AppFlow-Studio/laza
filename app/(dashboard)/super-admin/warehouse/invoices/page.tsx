"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Upload,
    FileText,
    CheckCircle2,
    AlertCircle,
    X,
    Loader2,
    ChevronRight,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type UploadStep = "upload" | "scanning" | "review" | "done";

interface ExtractedField {
    label: string;
    value: string;
    confidence: "high" | "medium" | "low";
    editable?: boolean;
}

// ─── Mock extracted fields ────────────────────────────────────────────────────

const MOCK_FIELDS: ExtractedField[] = [
    { label: "Vendor Name", value: "Pacific Fresh Distributors", confidence: "high" },
    { label: "Invoice Number", value: "INV-2024-0418", confidence: "high" },
    { label: "Invoice Date", value: "2024-04-18", confidence: "high" },
    { label: "Due Date", value: "2024-05-18", confidence: "medium" },
    { label: "Subtotal", value: "$3,240.00", confidence: "high" },
    { label: "Tax", value: "$259.20", confidence: "medium" },
    { label: "Total Amount", value: "$3,499.20", confidence: "high" },
    { label: "Payment Terms", value: "Net 30", confidence: "low" },
];

// ─── Animation variants ───────────────────────────────────────────────────────

const fadeUp = {
    hidden: { opacity: 0, y: 10 },
    show: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.26,
            delay: i * 0.07,
            ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
        },
    }),
};

// ─── Confidence badge ─────────────────────────────────────────────────────────

function ConfidenceBadge({ confidence }: { confidence: ExtractedField["confidence"] }) {
    const cfg = {
        high: { cls: "bg-green-50 text-green-700 border-green-200", label: "High" },
        medium: { cls: "bg-yellow-50 text-yellow-700 border-yellow-200", label: "Medium" },
        low: { cls: "bg-red-50 text-red-700 border-red-200", label: "Low" },
    };
    return (
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${cfg[confidence].cls}`}>
            {cfg[confidence].label}
        </span>
    );
}

// ─── Step 1: Upload zone ──────────────────────────────────────────────────────

function UploadZone({ onFileSelected }: { onFileSelected: (file: File) => void }) {
    const [dragging, setDragging] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files[0];
            if (file) onFileSelected(file);
        },
        [onFileSelected],
    );

    return (
        <motion.div
            custom={1}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200 py-20 px-8 text-center ${
                dragging
                    ? "border-indigo-400 bg-indigo-50"
                    : "border-gray-300 bg-white hover:border-indigo-300 hover:bg-indigo-50/40"
            }`}
        >
            <input
                ref={inputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="sr-only"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onFileSelected(file);
                }}
            />
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-colors ${dragging ? "bg-indigo-100" : "bg-gray-100"}`}>
                <Upload className={`w-7 h-7 transition-colors ${dragging ? "text-indigo-600" : "text-gray-400"}`} />
            </div>
            <p className="text-base font-semibold text-gray-800 mb-1">
                Drop your invoice here
            </p>
            <p className="text-sm text-gray-500">
                or click to browse — PDF, JPG, PNG supported
            </p>
        </motion.div>
    );
}

// ─── Step 2: Scanning animation ───────────────────────────────────────────────

function ScanningView({ fileName }: { fileName: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1, transition: { duration: 0.25 } }}
            className="flex flex-col items-center justify-center py-20 text-center"
        >
            <div className="relative w-48 h-64 bg-gray-100 rounded-xl border border-gray-200 overflow-hidden mb-6 shadow-md">
                <div className="absolute inset-0 flex items-center justify-center">
                    <FileText className="w-12 h-12 text-gray-300" />
                </div>
                <motion.div
                    className="absolute inset-x-0 h-0.5 bg-indigo-400"
                    style={{ boxShadow: "0 0 8px rgba(99,102,241,0.6)" }}
                    initial={{ top: "0%" }}
                    animate={{ top: ["0%", "100%", "0%"] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />
            </div>
            <div className="flex items-center gap-2 text-gray-600 mb-2">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                <p className="text-sm font-medium">Scanning invoice…</p>
            </div>
            <p className="text-xs text-gray-400">{fileName}</p>
        </motion.div>
    );
}

// ─── Step 3: Review extracted fields ─────────────────────────────────────────

function ReviewFields({
    fields,
    onConfirm,
    onReset,
}: {
    fields: ExtractedField[];
    onConfirm: () => void;
    onReset: () => void;
}) {
    const [values, setValues] = useState<Record<string, string>>(
        Object.fromEntries(fields.map((f) => [f.label, f.value])),
    );
    const lowConfidenceCount = fields.filter((f) => f.confidence === "low").length;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.22 } }}
            className="space-y-5"
        >
            {lowConfidenceCount > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0, transition: { duration: 0.22, delay: 0.1 } }}
                    className="flex items-start gap-3 px-4 py-3 bg-yellow-50 border border-yellow-200 rounded-xl"
                >
                    <AlertCircle className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-yellow-700">
                        <strong>{lowConfidenceCount} field{lowConfidenceCount > 1 ? "s" : ""}</strong> had low confidence — review them carefully before confirming.
                    </p>
                </motion.div>
            )}

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-700">Extracted Fields</p>
                    <p className="text-xs text-gray-400">{fields.length} fields detected</p>
                </div>
                <div className="divide-y divide-gray-50">
                    {fields.map((field, i) => (
                        <motion.div
                            key={field.label}
                            custom={i}
                            variants={fadeUp}
                            initial="hidden"
                            animate="show"
                            className={`flex items-center gap-4 px-5 py-3.5 ${
                                field.confidence === "low" ? "bg-yellow-50/50" : ""
                            }`}
                        >
                            <div className="w-36 shrink-0">
                                <p className="text-xs font-medium text-gray-500">{field.label}</p>
                            </div>
                            <div className="flex-1">
                                <input
                                    type="text"
                                    value={values[field.label] ?? ""}
                                    onChange={(e) =>
                                        setValues((prev) => ({ ...prev, [field.label]: e.target.value }))
                                    }
                                    className={`w-full text-sm font-medium text-gray-900 bg-transparent border-b focus:outline-none focus:border-indigo-400 transition-colors pb-0.5 ${
                                        field.confidence === "low"
                                            ? "border-yellow-300"
                                            : "border-transparent hover:border-gray-300"
                                    }`}
                                />
                            </div>
                            <ConfidenceBadge confidence={field.confidence} />
                        </motion.div>
                    ))}
                </div>
            </div>

            <div className="flex gap-3">
                <button
                    type="button"
                    onClick={onReset}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                    <X className="w-4 h-4" /> Start Over
                </button>
                <button
                    type="button"
                    onClick={onConfirm}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
                >
                    Confirm & Save <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </motion.div>
    );
}

// ─── Step 4: Done ─────────────────────────────────────────────────────────────

function DoneView({ onReset }: { onReset: () => void }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1, transition: { duration: 0.28, ease: [0.25, 0.1, 0.25, 1] } }}
            className="flex flex-col items-center justify-center py-20 text-center"
        >
            <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1, transition: { type: "spring", damping: 14, stiffness: 260, delay: 0.1 } }}
                className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-5"
            >
                <CheckCircle2 className="w-8 h-8 text-green-600" />
            </motion.div>
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.24, delay: 0.3 } }}
            >
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Invoice saved</h3>
                <p className="text-sm text-gray-500 mb-6">
                    The extracted data has been saved to warehouse expenses.
                </p>
                <button
                    type="button"
                    onClick={onReset}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
                >
                    Upload Another Invoice
                </button>
            </motion.div>
        </motion.div>
    );
}

// ─── Step indicator ───────────────────────────────────────────────────────────

const STEP_LABELS = ["Upload", "Scanning", "Review", "Done"];
const STEP_IDS: UploadStep[] = ["upload", "scanning", "review", "done"];

function StepIndicator({ current }: { current: UploadStep }) {
    const currentIdx = STEP_IDS.indexOf(current);
    return (
        <div className="flex items-center gap-0">
            {STEP_LABELS.map((label, i) => {
                const done = i < currentIdx;
                const active = i === currentIdx;
                return (
                    <div key={label} className="flex items-center">
                        <div className="flex flex-col items-center gap-1.5">
                            <div
                                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors duration-300 ${
                                    done
                                        ? "bg-indigo-600 text-white"
                                        : active
                                            ? "bg-indigo-100 text-indigo-700 ring-2 ring-indigo-400 ring-offset-2"
                                            : "bg-gray-100 text-gray-400"
                                }`}
                            >
                                {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                            </div>
                            <span
                                className={`text-[10px] font-medium whitespace-nowrap transition-colors ${
                                    active ? "text-indigo-600" : done ? "text-gray-500" : "text-gray-300"
                                }`}
                            >
                                {label}
                            </span>
                        </div>
                        {i < STEP_LABELS.length - 1 && (
                            <div
                                className={`h-px w-12 mx-1 mb-5 transition-colors duration-300 ${
                                    i < currentIdx ? "bg-indigo-400" : "bg-gray-200"
                                }`}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function InvoiceUploadPage() {
    const [step, setStep] = useState<UploadStep>("upload");
    const [file, setFile] = useState<File | null>(null);

    const handleFileSelected = (f: File) => {
        setFile(f);
        setStep("scanning");
        setTimeout(() => setStep("review"), 2800);
    };

    const handleReset = () => {
        setFile(null);
        setStep("upload");
    };

    return (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-8">
            <motion.div
                custom={0}
                variants={fadeUp}
                initial="hidden"
                animate="show"
                className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
            >
                <div>
                    <h1 className="text-xl font-semibold text-gray-900">Invoice Upload</h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        AI extracts key fields automatically — review and confirm before saving
                    </p>
                </div>
                <StepIndicator current={step} />
            </motion.div>

            <AnimatePresence mode="wait">
                {step === "upload" && (
                    <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <UploadZone onFileSelected={handleFileSelected} />
                    </motion.div>
                )}
                {step === "scanning" && (
                    <motion.div key="scanning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <ScanningView fileName={file?.name ?? "invoice.pdf"} />
                    </motion.div>
                )}
                {step === "review" && (
                    <motion.div key="review" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <ReviewFields
                            fields={MOCK_FIELDS}
                            onConfirm={() => setStep("done")}
                            onReset={handleReset}
                        />
                    </motion.div>
                )}
                {step === "done" && (
                    <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <DoneView onReset={handleReset} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
