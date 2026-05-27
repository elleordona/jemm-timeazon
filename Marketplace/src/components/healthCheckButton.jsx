
import { useEffect, useState } from "react";
import "./healthCheckButton.css";
 
export default function BackendStatus() {
  const [status, setStatus] = useState("checking");
 
  useEffect(() => {
    async function check() {
        try {
          const response = await fetch("/api/healthcheck", { method: "GET" });
     
          // Must return JSON (our API will do this later)
          const contentType = response.headers.get("content-type");
     
          if (!response.ok || !contentType?.includes("application/json")) {
            throw new Error("Not a real API response");
          }
     
          setStatus("online");
        } catch {
          setStatus("offline");
        }
      }
 
    check();
  }, []);
 
  return (
    <div className="container">
      <div className="title"></div>
 
      {status === "checking" && (
        <div className="checking">Checking backend</div>
      )}
 
      {status === "online" && (
  <div className="status-indicator online"></div>
      )}

{status === "offline" && (
  <div className="status-indicator offline"></div>
      )}

    </div>
  );
}
 
 
