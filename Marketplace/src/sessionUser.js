
export function getSessionEmail() {
    if (typeof window === "undefined") return null;
    return window.sessionStorage.getItem("userEmail");
}
  
export function setSessionEmail(email) {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem("userEmail", email);
}
  
export function clearSessionEmail() {
    if (typeof window === "undefined") return;
    window.sessionStorage.removeItem("userEmail");
}
