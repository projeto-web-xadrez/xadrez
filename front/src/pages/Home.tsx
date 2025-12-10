
import { useNavigate } from "react-router-dom"
import "../styles/Home.css"
export default function Home() {
    const navigate = useNavigate()
    return (
        <div className="home-page">
            <div className="home-page-title-container">
                <h1 className="home-page-title">
                    XADREZ WEB
                </h1>
            </div>
            <p className="home-page-description">Play chess against other players, watch live matches and analyze games through PGN</p>
            <button className="home-page-button" onClick={() => navigate("/login")}>Get started</button>
        </div>
    )
}