import './App.css';

const bookingHighlights = [
  'Search domestic and international flights',
  'Compare schedules, fares, and cabin options',
  'Manage passenger details in one place',
];

function App() {
  return (
    <main className="app-shell">
      <section className="hero-card">
        <span className="hero-badge">Airline Booking Frontend</span>
        <h1>React project is ready for your booking flow.</h1>
        <p>
          The application is bootstrapped with Vite, guarded by ESLint and Prettier, and enforced
          through Husky pre-commit hooks.
        </p>

        <ul className="highlight-list">
          {bookingHighlights.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}

export default App;
