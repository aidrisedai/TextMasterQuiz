import * as React from "react";

export default function App() {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "white", padding: "2rem" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: "bold", color: "#1e40af", marginBottom: "1rem" }}>
        Text4Quiz
      </h1>
      <p style={{ color: "#374151", fontSize: "1.1rem", marginBottom: "1rem" }}>
        SMS Trivia Application - React is working!
      </p>
      <div style={{ marginTop: "1rem", padding: "1rem", backgroundColor: "#f3f4f6", borderRadius: "8px" }}>
        <p>✓ React is rendering correctly</p>
        <p>✓ TypeScript is working</p>
        <p>✓ CSS imports are working</p>
        <p>✓ Directory structure is correct</p>
      </div>
    </div>
  );
}