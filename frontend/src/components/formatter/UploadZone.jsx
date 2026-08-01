"use client";
import { useDropzone } from "react-dropzone";
import { UploadCloud } from "lucide-react";
export default function UploadZone({ onFiles }) { const drop = useDropzone({ onDrop: onFiles, maxSize: 50 * 1024 * 1024 }); return <div {...drop.getRootProps()} className={`upload-zone ${drop.isDragActive ? "active" : ""}`}><input {...drop.getInputProps()} /><UploadCloud /><strong>Drop files here</strong><span>or click to browse · maximum 50 MB</span></div>; }
