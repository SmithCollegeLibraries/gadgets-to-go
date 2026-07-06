import { useEffect } from 'react';
import SchoolCard from '../components/SchoolCard';
import useSchoolStore from '../store/schoolStore';
import amherstImage from '../../public/images/amherst.gif';
import hampshireImage from '../../public/images/hampshire.gif';
import mtholyokeImage from '../../public/images/mtholyoke.gif';
import smithImage from '../../public/images/smith.gif';
import umassImage from '../../public/images/umass.gif';
import './Home.css'; // Specific styles for the home page

const schools = [
    { id: 'amherst', name: 'Amherst College', path: '/school/amherst', image: amherstImage },
    { id: 'hampshire', name: 'Hampshire College', path: '/school/hampshire', image: hampshireImage },
    { id: 'mtholyoke', name: 'Mount Holyoke College', path: '/school/mtholyoke', image: mtholyokeImage },
    { id: 'smith', name: 'Smith College', path: '/school/smith', image: smithImage },
    { id: 'umass', name: 'UMass Amherst', path: '/school/umass', image: umassImage },
];

const Home = () => {
    const { fetchLayoutData } = useSchoolStore();

    useEffect(() => {
        // Prefetch layout data to ensure fast transitions.
        // This caches the styles so when users click a school, the header/colors are ready.
        // Pass false to avoid updating the active store state (layoutData) which is not used here.
        schools.forEach(school => fetchLayoutData(school.id, false));
    }, [fetchLayoutData]);

    return (
        <div className="home-container">
            <div className="hero-section">
                <h1 className="main-title">Gadgets-to-Go</h1>
                <p className="subtitle">Select your campus to get started</p>
            </div>

            <main className="schools-grid">
                {schools.map((school, index) => (
                    <SchoolCard
                        key={school.id}
                        name={school.name}
                        path={school.path}
                        image={school.image}
                        delay={index * 100} // Staggered animation
                    />
                ))}
            </main>
        </div>
    );
};

export default Home;
