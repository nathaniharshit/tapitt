import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// No useEffect or function App here!

createRoot(document.getElementById("root")!).render(<App />);
