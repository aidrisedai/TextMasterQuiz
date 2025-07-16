console.log("Script is loading...");

document.addEventListener('DOMContentLoaded', () => {
  console.log("DOM content loaded");
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="padding: 20px; font-family: Arial, sans-serif;">
        <h1 style="color: #1e40af; margin-bottom: 20px;">Text4Quiz</h1>
        <p style="color: #374151; font-size: 16px;">SMS Trivia Application</p>
        <div style="margin-top: 20px; padding: 15px; background-color: #f3f4f6; border-radius: 8px;">
          <p>✓ JavaScript is working</p>
          <p>✓ DOM manipulation is working</p>
          <p>✓ Server is running</p>
        </div>
      </div>
    `;
  } else {
    console.error("Root element not found");
  }
});