import React from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";

function Home() {
  return (
    <div style={{ padding: 40 }}>
      <h1>TCL Babcock (Migration Mode)</h1>
      <p>This is a temporary SPA shell while migrating off TanStack Start.</p>
      <p>
        Work-in-progress routes:
      </p>
      <ul>
        <li><Link to="/admin">Admin (placeholder)</Link></li>
        <li><Link to="/register">Register (placeholder)</Link></li>
      </ul>
    </div>
  );
}

function Placeholder({ title }: { title: string }) {
  return (
    <div style={{ padding: 40 }}>
      <h2>{title}</h2>
      <p>Page not migrated yet. The TanStack route will be ported here.</p>
      <p><Link to="/">Back home</Link></p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin" element={<Placeholder title="Admin Dashboard" />} />
        <Route path="/register" element={<Placeholder title="Register" />} />
        <Route path="/studio" element={<Placeholder title="Studio" />} />
        <Route path="/status" element={<Placeholder title="Application Status" />} />
        <Route path="/committees/:id" element={<Placeholder title="Committee" />} />
      </Routes>
    </BrowserRouter>
  );
}
