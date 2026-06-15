import { Link } from 'react-router-dom';
import './SchoolCard.css'; // We will create this for specific card styles

const SchoolCard = ({ name, path, image, delay }) => {
    return (
        <div className="school-card-wrapper" style={{ animationDelay: `${delay}ms` }}>
            <Link to={path} className="school-card">
                <div className="school-card-image-container">
                    <img src={image} alt={name} className="school-card-image" />
                </div>
                <div className="school-card-overlay">
                    <span className="school-card-name">{name}</span>
                </div>
            </Link>
        </div>
    );
};

export default SchoolCard;
