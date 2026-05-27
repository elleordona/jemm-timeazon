// // Delete product from product card by admin 

// import React from "react";
// import { useState } from "react";
// import "./ProductPage.css";

// // hard-coded admin credentials for the Admin login /////////

// const ADMIN_CREDENTIALS = {
//     username: "admin",
//     password: "qwerty123"
// };

// const MOCK_USER = {
//     name: "Admin",
//     role: "admin", 
// };

// const IS_ADMIN = MOCK_USER.role === "admin";


// // Verify admin- 

// async function verifyAdminCredentials(username, password) {
//     await new Promise((res) => setTimeout(res, 800));

//     if (
//         username !== ADMIN_CREDENTIALS.username ||
//         password !== ADMIN_CREDENTIALS.password
//     ) {
//         throw new Error("Incorrect username or password.");
//     }
// }


// const API_BASE_URL = "https://timeazon.cta-training.academy/api/product/";

// async function apiDeleteProduct(productId) {
//   const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
//     method: "DELETE",
//     headers: {
//       "Content-Type": "application/json",
      
//     },
//   });
//   if (!response.ok) {
//     const err = await response.json();
//     throw new Error(err.message || "Failed to delete product.");
//   }
//   return response.json();
// }

// //  Modal setup -> login -> confirm -> loading -> deletion in progress //
// function DeleteModal({ product, onSuccess, onCancel })  {
//     const [step, setStep]           = useState("login");
//     const [username, setUsername]   = useState("");
//     const [password, setPassword]   = useState("");
//     const [showPassword, setShowPassword] = useState(false);
//     const [error, setError]             = useState(null);
//     const [isVerifying, setVerifying]   = useState(false);
    
//     // Login 

//     const handleLogin = async () => {
//         if (!username.trim() || !password.trimEnd()) {
//             setError("Please enter both username and password.");
//             return;
//         }
//         setIsVerifying(true);
//         setError(null);
//         try {
//             await verifyAdminCredentials(username, password);
//             setStep("Confirm");
//         }   catch (err) {
//             setError(err.message);
//         }   finally {
//             setIsVerifying(false);
//         }
//     };

//     // confirm the login

//     const handleConfirm = async () => {
//         setStep("loading");
//         try {
//             await apiDeleteProduct(product.id);
//             onSuccess();
//            } catch (err) {
//             setError(err.message);
//             setStep("confirm");
//         }
//     };

//     return (
//         <div style={s.overlay}>
//             <div style={s.modal}>

//             {step === "login" && (
//                 <>
//                     <div style={s.modalIconLock}>&#128274;</div>
//                     <h2 style={s.modalTitle}>Admin Verification</h2>
//                     <p style={s.modalSubtitle}>
//                         Confirm your identity to delete{" "}
//                         <strong style={{ color: "#dc2626"}}>{product.name}</strong>
//                     </p>

//                     <div style={s.formGroup}>
//                         <label style={s.label}>Username</label>
//                         <input
//                             style={s.input}
//                             type="text"
//                             placeholder="admin"
//                             value={username}
//                             onChange={(e) => setUsername(e.target.value)}
//                             onKeyDown={(e) => e.key === "Enter" && handleLogin()}
//                             autoFocus
//                         />
//                     </div>

//                     <div style={s.formGroup}>
//                         <label style={s.label}>Password</label>
//                         <div style={s.passwordWrap}>
//                             <input
//                             style={{ ...s.input, paddingRight: "2.8rem" }}
//                             type={showPassword ? "text" : "password"}
//                             placeholder="••••••••••••"
//                             value={password}
//                             onChange={(e) => setPassword(e.target.value)}
//                             onKeyDown={(e) => e.key === "Enter" && handleLogin()}
//                             />
//                             <button
//                             style={s.eyeBtn}
//                             onClick={() => setShowPassword((v) => !v)}
//                             tabIndex={-1}
//                             title={showPassword ? "Hide password" : "Show password"}
//                             >
//                             {showPassword ? "🙈" : "👁️"}
//                             </button>
//                         </div>
//                     </div>

//                     {error && <p style={s.errorMsg}> ⚠ {error}</p>}

//                     <div style={s.modalActions}>
//                         <button style={s.cancelBtn} onClick={onCancel}>
//                             Cancel
//                         </button>
//                         <button
//                             style={{
//                                 ...s.verifyBtn,
//                                 opacity: isVerifying ? 0.7 : 1,
//                                 cursor: isVerifying ? "not allowed" : "pointer",
//                             }}
//                             onClick={handleLogin}
//                             disabled={isVerifying}
//                         >
//                             {isVerifying ? "Veryfing..." : "Verify Identity"}
//                         </button>
//                     </div>
//                 </>
//             )}

//             {step === "confirm" && (
//                 <>
//                     <div style={s.modalIconWarn}>&#9888;</div>
//                     <div style={s.verifiedBadge}>✓ Identity Verified</div>
//                     <h2 style={s.modalTitle}>Delete Product?</h2>
//                     <p style={s.modalSubtitle}>
//                         You are about to permanently delete{" "}
//                         <strong style={{ color: "#dc2626"}}>{product.name} </strong>
//                         <br />
//                         This action <strong> cannot be undone</strong>
//                     </p>

//                     {error && <p style={s.errorMsg}> ⚠ {error}</p>}

//                     <div style={s.modalActions}>
//                         <button style={s.cancelBtn} onClick={onCancel}>
//                             Cancel
//                         </button>
//                     </div>
//                 </>
//             )}

//             {/* Loading in  progress */}
            
//             {step === "loading" && (
//                 <div style={s.loadingWrap}>
//                     <div style={s.spinner} />
//                     <p style={s.loadingText}>Deleting product...</p>
//                 </div>
//             )}
//         </div>
//     </div>
//     );
// }

// // deletion success

// function AdminDeleteButton({ product, onDeleting }) {
//     const [showModal, setShowModal] = useState(false);

//     if (!IS_ADMIN) return null;

//     return (
//         <>
//         <button
//             style={s.deleteBtn}
//             onClick={() => setShowModal(true)}
//             aria-label={`Delete ${product.name}`}
//             onMouseEnter={(e) => Object.assign(e.currentTarget.style, s.deleteBtnHover)}
//             onMouseLeave={(e) => Object.assign(e.currentTarget.style, s.deleteBtn)}
//         >
//             <TrashIcon />
//             Delete
//         </button>

//         {showModal && (
//             <DeleteModal
//             product={product}
//             onSuccess={()  => {
//                 setShowModal(false);
//                 onDeleted();
//             }}
//             onCancel={() => setShowModal(false)}
//         />
//        )}
//     </>    
//     );
// }

// /* Inject spinner keyframes */

// const styleTag = document.createElement("style");
// styleTag.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
// document.head.appendChild(styleTag);


// export default DeleteProdButton;
