import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import "./ProductPage.css"



export const BackButton = () => {
    let navigate = useNavigate();
    return (
        <button onClick={() => navigate(-1)}>🡸</button>
    );
};
