import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import SchoolCard from '../components/SchoolCard';
import useSchoolStore from '../store/schoolStore';
import './Home.css'; // Specific styles for the home page

const Home = () => {
    const { appConfig, fetchLayoutData, loadConfig } = useSchoolStore();
    const schools = appConfig.institutions || [];
    const deployment = appConfig.deployment || {};
    const primarySlug = deployment.primaryInstitutionSlug || schools[0]?.slug;

    useEffect(() => {
        loadConfig()
            .then((config) => {
                config.institutions.forEach((school) => fetchLayoutData(school.slug, false));
            })
            .catch((error) => {
                console.error('Unable to load application configuration', error);
            });
    }, [fetchLayoutData, loadConfig]);

    if (deployment.type === 'single-library' && deployment.homePage === 'redirect' && primarySlug) {
        return <Navigate to={`/school/${primarySlug}`} replace />;
    }

    return (
        <main className="home-container">
            <div className="hero-section">
                <h1 className="main-title">{appConfig.appName || 'Library Equipment'}</h1>
                <p className="subtitle">
                    {deployment.type === 'single-library' ? 'Get started' : 'Select your library to get started'}
                </p>
            </div>

            <section className="schools-grid" aria-label="Libraries">
                {schools.map((school, index) => (
                    <SchoolCard
                        key={school.slug}
                        name={school.name}
                        path={`/school/${school.slug}`}
                        image={school.image}
                        delay={index * 100} // Staggered animation
                    />
                ))}
            </section>
        </main>
    );
};

export default Home;
