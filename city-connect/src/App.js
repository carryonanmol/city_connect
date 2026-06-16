import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';


const firebaseConfig = {

};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


// --- SVG Icons (as Components) ---
// Using inline SVGs to avoid external dependencies like lucide-react in a single file.
const Icon = ({ name, className }) => {
    const icons = {
        home: (<><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></>),
        ticket: (<><path d="M2 9a3 3 0 0 1 0 6v1a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-1a3 3 0 0 1 0-6V8a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/></>),
        wallet: (<><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></>),
        arrowLeft: (<><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></>),
        chevronRight: <path d="m9 18 6-6-6-6"/>,
        bus: (<><path d="M8 6v6"/><path d="M16 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s-1-1.7-1-4V6a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v8c0 2.3 1 4 1 4h3"/><circle cx="10" cy="18" r="2"/><circle cx="15" cy="18" r="2"/></>),
        metro: (<><path d="M18 8a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1Z"/><path d="M12 18V6"/><path d="m8 14 2-2 2 2"/><path d="m14 14 2-2 2 2"/><path d="M6 3h12"/><path d="M6 21h12"/></>),
    };
    return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>{icons[name]}</svg>;
};

// --- Mock Data (Static) ---
const mockRoutes = [
    { id: 1, from: 'Mambakkam', to: 'Guindy', duration: 75, cost: 45.00, type: 'Fastest', modes: [{type: 'Bus', num: '51K', icon: 'bus'}, {type: 'Metro', icon: 'metro'}] },
    { id: 2, from: 'Mambakkam', to: 'Guindy', duration: 95, cost: 25.00, type: 'Cheapest', modes: [{type: 'Bus', num: '99', icon: 'bus'}, {type: 'Bus', num: 'E18', icon: 'bus'}] },
    { id: 3, from: 'T. Nagar', to: 'Central Station', duration: 40, cost: 30.00, type: 'Fastest', modes: [{type: 'Metro', icon: 'metro'}] },
    { id: 4, from: 'T. Nagar', to: 'Central Station', duration: 55, cost: 15.00, type: 'Cheapest', modes: [{type: 'Bus', num: '17D', icon: 'bus'}] },
    { id: 5, from: 'Adyar', to: 'Guindy', duration: 25, cost: 20.00, type: 'Direct', modes: [{type: 'Bus', num: '23C', icon: 'bus'}] },
    { id: 6, from: 'Guindy', to: 'Central Station', duration: 35, cost: 25.00, type: 'Balanced', modes: [{type: 'Metro', icon: 'metro'}] },
];

// --- Main App Component ---
export default function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [screen, setScreen] = useState('home'); // home, planner, routes, trip, ticket, wallet, auth
    const [walletBalance, setWalletBalance] = useState(0);
    const [activeTrip, setActiveTrip] = useState(null);
    const [activeTicket, setActiveTicket] = useState(null);
    const [journeyParams, setJourneyParams] = useState({ from: 'Mambakkam', to: 'Guindy' });

    // --- Authentication Effect ---
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
            if (!currentUser) {
                setScreen('auth'); // Redirect to auth screen if not logged in
                setWalletBalance(0); // Reset wallet on logout
            } else {
                setScreen('home');
            }
        });
        return () => unsubscribe();
    }, []);

    // --- Firestore Wallet Listener ---
    useEffect(() => {
        if (user) {
            const userDocRef = doc(db, "users", user.uid);
            const unsubscribe = onSnapshot(userDocRef, (doc) => {
                if (doc.exists()) {
                    setWalletBalance(doc.data().walletBalance || 0);
                } else {
                    // Create user document if it doesn't exist
                    setDoc(userDocRef, { walletBalance: 0, email: user.email });
                }
            });
            return () => unsubscribe();
        }
    }, [user]);

    const handleNavigation = (targetScreen) => {
        if (user) {
            setScreen(targetScreen);
        } else {
            setScreen('auth');
        }
    };
    
    if (loading) {
        return <div className="flex items-center justify-center h-screen">Loading...</div>;
    }

    return (
        <div className="bg-gray-200 flex items-center justify-center min-h-screen">
            <div className="w-full max-w-sm h-[800px] max-h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col relative">
                <main className="flex-grow flex flex-col">
                    {screen === 'auth' && <AuthScreen setScreen={setScreen} />}
                    {user && (
                        <>
                            {screen === 'home' && <HomeScreen setScreen={setScreen} walletBalance={walletBalance} />}
                            {screen === 'planner' && <PlannerScreen setScreen={setScreen} setJourneyParams={setJourneyParams} />}
                            {screen === 'routes' && <RoutesScreen setScreen={setScreen} journeyParams={journeyParams} walletBalance={walletBalance} setActiveTrip={setActiveTrip} setActiveTicket={setActiveTicket} userId={user.uid} />}
                            {screen === 'trip' && <TripScreen activeTrip={activeTrip} />}
                            {screen === 'ticket' && <TicketScreen activeTicket={activeTicket} setScreen={setScreen} />}
                            {screen === 'wallet' && <WalletScreen walletBalance={walletBalance} userId={user.uid} />}
                        </>
                    )}
                </main>
                {user && screen !== 'auth' && <BottomNav activeScreen={screen} onNavigate={handleNavigation} />}
            </div>
        </div>
    );
}

// --- Screen Components ---

function AuthScreen({ setScreen }) {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleAuthAction = async (e) => {
        e.preventDefault();
        setError('');
        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                await createUserWithEmailAndPassword(auth, email, password);
                // The onAuthStateChanged listener in App will handle navigation
            }
        } catch (err) {
            setError(err.message.replace('Firebase: ', ''));
        }
    };

    return (
        <div className="p-6 flex flex-col justify-center h-full bg-gray-50">
            <h1 className="text-3xl font-bold text-gray-800 text-center">City Connect</h1>
            <p className="text-center text-gray-500 mb-8">{isLogin ? 'Welcome back!' : 'Create your account'}</p>
            <form onSubmit={handleAuthAction} className="space-y-4">
                <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 border rounded-md" required />
                <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 border rounded-md" required />
                <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700">{isLogin ? 'Log In' : 'Sign Up'}</button>
                {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            </form>
            <button onClick={() => setIsLogin(!isLogin)} className="mt-4 text-center text-sm text-indigo-600 hover:underline">
                {isLogin ? "Need an account? Sign Up" : "Already have an account? Log In"}
            </button>
        </div>
    );
}


function HomeScreen({ setScreen, walletBalance }) {
    return (
        <div className="flex-grow flex flex-col">
            <header className="p-4 bg-white border-b border-gray-100 flex justify-between items-center">
                <div>
                    <h1 className="text-xl font-bold text-gray-800">City Connect</h1>
                    <p className="text-sm text-gray-500">Your unified transit companion.</p>
                </div>
                <button onClick={() => signOut(auth)} className="text-xs bg-red-500 text-white px-3 py-1 rounded-md">Logout</button>
            </header>
            <main className="flex-grow bg-gray-50 p-4 flex flex-col">
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <h2 className="font-semibold text-gray-700">Welcome!</h2>
                    <div className="mt-2 flex justify-between items-center bg-indigo-50 p-3 rounded-lg">
                        <div className="flex items-center space-x-2">
                             <Icon name="wallet" className="w-6 h-6 text-indigo-600" />
                            <span className="font-medium text-gray-700">Wallet Balance</span>
                        </div>
                        <span className="font-bold text-lg text-indigo-700">₹{walletBalance.toFixed(2)}</span>
                    </div>
                </div>
                <div className="mt-6 flex-grow flex flex-col items-center justify-center">
                    <img src="https://placehold.co/300x200/e0e7ff/4f46e5?text=City+Transit+Map" alt="City Map" className="rounded-lg shadow-md"/>
                    <button onClick={() => setScreen('planner')} className="mt-8 w-full bg-indigo-600 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:bg-indigo-700 transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                        Plan a New Journey
                    </button>
                </div>
            </main>
        </div>
    );
}

function PlannerScreen({ setScreen, setJourneyParams }) {
    const [start, setStart] = useState('Mambakkam');
    const [end, setEnd] = useState('Guindy');
    const [error, setError] = useState('');
    
    const handleFindRoutes = () => {
        if (start === end) {
            setError('Start and end points cannot be the same.');
            return;
        }
        setError('');
        setJourneyParams({ from: start, to: end });
        setScreen('routes');
    };

    return (
        <div className="flex flex-col h-full">
            <header className="p-4 bg-white border-b border-gray-100 flex items-center space-x-3">
                <button onClick={() => setScreen('home')}><Icon name="arrowLeft" className="w-6 h-6 text-gray-600" /></button>
                <h1 className="text-xl font-bold text-gray-800">Journey Planner</h1>
            </header>
            <main className="flex-grow bg-gray-50 p-6 space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Starting from</label>
                    <select value={start} onChange={e => setStart(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-3 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                        <option>Mambakkam</option><option>Guindy</option><option>T. Nagar</option><option>Adyar</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Going to</label>
                    <select value={end} onChange={e => setEnd(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-3 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                        <option>Guindy</option><option>T. Nagar</option><option>Adyar</option><option>Central Station</option>
                    </select>
                </div>
                <button onClick={handleFindRoutes} className="w-full bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-indigo-700 transition duration-300">
                    Find Routes
                </button>
                {error && <p className="text-red-500 text-sm text-center mt-2">{error}</p>}
            </main>
        </div>
    );
}

function RoutesScreen({ setScreen, journeyParams, walletBalance, setActiveTrip, setActiveTicket, userId }) {
    const availableRoutes = useMemo(() => mockRoutes.filter(r => r.from === journeyParams.from && r.to === journeyParams.to), [journeyParams]);

    const selectRoute = async (route) => {
        if (walletBalance < route.cost) {
            alert("Insufficient wallet balance. Please add money.");
            return;
        }

        const newBalance = walletBalance - route.cost;
        const userDocRef = doc(db, "users", userId);
        
        try {
            await setDoc(userDocRef, { walletBalance: newBalance }, { merge: true });
            const ticketData = { ...route, ticketId: `TICKET-${Date.now()}` };
            setActiveTrip(ticketData);
            setActiveTicket(ticketData);
            setScreen('trip');
        } catch (error) {
            console.error("Error purchasing ticket: ", error);
            alert("Could not process your purchase. Please try again.");
        }
    };
    
    return (
        <div className="flex flex-col h-full">
            <header className="p-4 bg-white border-b border-gray-100 flex items-center space-x-3">
                <button onClick={() => setScreen('planner')}><Icon name="arrowLeft" className="w-6 h-6 text-gray-600" /></button>
                <div>
                    <h1 className="text-xl font-bold text-gray-800">Available Routes</h1>
                    <p className="text-sm text-gray-500">{journeyParams.from} to {journeyParams.to}</p>
                </div>
            </header>
            <main className="flex-grow bg-gray-50 p-4 space-y-3 overflow-y-auto">
                {availableRoutes.length > 0 ? availableRoutes.map(route => (
                    <RouteCard key={route.id} route={route} onSelect={() => selectRoute(route)} />
                )) : (
                    <div className="text-center text-gray-500 p-8 bg-white rounded-lg">No direct routes found.</div>
                )}
            </main>
        </div>
    );
}

function RouteCard({ route, onSelect }) {
    return (
        <div onClick={onSelect} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:border-indigo-500 hover:shadow-md transition">
            <div className="flex justify-between items-center">
                <div>
                    <span className={`text-xs font-bold ${route.type === 'Fastest' ? 'text-green-600' : 'text-yellow-600'} bg-gray-100 px-2 py-1 rounded-full`}>{route.type}</span>
                    <div className="flex items-center space-x-2 mt-2">
                        {route.modes.map((mode, index) => (
                            <React.Fragment key={index}>
                                <div className="flex items-center space-x-2">
                                    <Icon name={mode.icon} className={`w-5 h-5 ${mode.type === 'Bus' ? 'text-red-500' : 'text-blue-500'}`} />
                                    <span className="font-medium text-sm text-gray-700">{mode.type} {mode.num || ''}</span>
                                </div>
                                {index < route.modes.length - 1 && <Icon name="chevronRight" className="w-4 h-4 text-gray-400" />}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-lg font-bold text-gray-800">{route.duration} min</p>
                    <p className="text-md font-semibold text-indigo-600">₹{route.cost.toFixed(2)}</p>
                </div>
            </div>
        </div>
    );
}

function TripScreen({ activeTrip }) {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const tripInterval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    clearInterval(tripInterval);
                    // In a real app, you'd navigate away or show a completion message.
                    // For now, it just stops.
                    return 100;
                }
                return prev + 2;
            });
        }, 1000);

        return () => clearInterval(tripInterval);
    }, [activeTrip]);

    if (!activeTrip) return <div className="p-4">No active trip.</div>;

    return (
        <div className="flex flex-col h-full">
            <header className="p-4 bg-white border-b border-gray-100">
                <h1 className="text-xl font-bold text-gray-800">Live Trip</h1>
                <p className="text-sm text-gray-500">To: {activeTrip.to}</p>
            </header>
            <main className="flex-grow bg-gray-50 p-4 flex flex-col">
                <div className="h-48 bg-gray-200 rounded-lg relative overflow-hidden flex items-center p-2">
                    <div className="w-full h-2 bg-gray-300 rounded-full"></div>
                    <div className="absolute top-1/2 -mt-4 transition-all duration-1000 ease-linear" style={{ left: `calc(${progress}% - 16px)`}}>
                         <div className="bg-indigo-600 text-white rounded-full p-2 shadow-lg">
                             <Icon name={activeTrip.modes[0].icon} className="w-5 h-5" />
                         </div>
                    </div>
                </div>
                <div className="mt-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex-grow">
                     <h3 className="font-bold text-lg mb-2">Your Journey</h3>
                     <ul className="list-disc list-inside space-y-1 text-gray-600">
                         {activeTrip.modes.map((mode, i) => <li key={i}><span className="font-semibold">{mode.type} {mode.num || ''}</span></li>)}
                     </ul>
                     <div className="mt-4 pt-4 border-t">
                         <p>ETA: <span className="font-bold text-green-600">{activeTrip.duration} mins</span></p>
                     </div>
                </div>
            </main>
        </div>
    );
}

function TicketScreen({ activeTicket, setScreen }) {
    if (!activeTicket) {
        return (
            <div className="flex flex-col h-full">
                <header className="p-4 bg-white border-b border-gray-100"><h1 className="text-xl font-bold text-gray-800">Your Ticket</h1></header>
                <main className="flex-grow flex flex-col items-center justify-center text-center p-6 bg-gray-50">
                    <Icon name="ticket" className="w-16 h-16 text-gray-300 mb-4"/>
                    <h2 className="text-lg font-semibold text-gray-700">No Active Ticket</h2>
                    <p className="text-gray-500 mb-4">Plan a journey to get a ticket.</p>
                    <button onClick={() => setScreen('planner')} className="bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg">Plan Journey</button>
                </main>
            </div>
        );
    }
    
    return (
        <div className="flex flex-col h-full">
            <header className="p-4 bg-white border-b border-gray-100"><h1 className="text-xl font-bold text-gray-800">Your Ticket</h1></header>
            <main className="flex-grow bg-indigo-600 text-white p-6 flex flex-col items-center justify-center text-center">
                <h2 className="text-lg font-semibold">Universal QR Ticket</h2>
                <p className="text-indigo-200 mb-4">Scan at any entry/exit point.</p>
                <div className="bg-white p-4 rounded-lg shadow-2xl">
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${activeTicket.ticketId}`} alt="QR Code"/>
                </div>
                <div className="mt-6 text-left w-full bg-indigo-700 p-4 rounded-lg">
                    <p><span className="font-semibold">From:</span> {activeTicket.from}</p>
                    <p><span className="font-semibold">To:</span> {activeTicket.to}</p>
                    <p><span className="font-semibold">Cost:</span> ₹{activeTicket.cost.toFixed(2)}</p>
                    <p className="mt-2 text-xs text-indigo-300">ID: {activeTicket.ticketId}</p>
                </div>
            </main>
        </div>
    );
}

function WalletScreen({ walletBalance, userId }) {
    const [amount, setAmount] = useState('');

    const handleAddMoney = async () => {
        const addAmount = parseFloat(amount);
        if (isNaN(addAmount) || addAmount <= 0) {
            alert("Please enter a valid amount.");
            return;
        }

        const newBalance = walletBalance + addAmount;
        const userDocRef = doc(db, "users", userId);
        try {
            await setDoc(userDocRef, { walletBalance: newBalance }, { merge: true });
            setAmount('');
            alert(`₹${addAmount.toFixed(2)} added successfully!`);
        } catch (error) {
            console.error("Error adding money: ", error);
            alert("Could not add money. Please try again.");
        }
    };
    
    return (
        <div className="flex flex-col h-full">
            <header className="p-4 bg-white border-b border-gray-100"><h1 className="text-xl font-bold text-gray-800">My Wallet</h1></header>
            <main className="flex-grow bg-gray-50 p-6">
                <div className="bg-white p-6 rounded-xl shadow-lg text-center">
                    <p className="text-gray-500">Current Balance</p>
                    <p className="text-4xl font-bold text-gray-800 my-2">₹{walletBalance.toFixed(2)}</p>
                    <div className="mt-6">
                        <label className="block text-sm font-medium text-gray-700">Add Money</label>
                        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" placeholder="Enter amount"/>
                        <button onClick={handleAddMoney} className="mt-4 w-full bg-green-500 text-white font-bold py-3 rounded-lg hover:bg-green-600 transition">Add to Wallet</button>
                    </div>
                </div>
            </main>
        </div>
    );
}


// --- Navigation Component ---
function BottomNav({ activeScreen, onNavigate }) {
    const navItems = [
        { id: 'home', icon: 'home', label: 'Home' },
        { id: 'ticket', icon: 'ticket', label: 'Ticket' },
        { id: 'wallet', icon: 'wallet', label: 'Wallet' },
    ];
    return (
        <nav className="bg-white border-t border-gray-200 grid grid-cols-3">
            {navItems.map(item => (
                <button 
                    key={item.id} 
                    onClick={() => onNavigate(item.id)}
                    className={`py-3 px-2 text-center text-gray-500 ${activeScreen === item.id ? 'text-indigo-600' : ''}`}
                >
                    <Icon name={item.icon} className="w-6 h-6 mx-auto" />
                    <span className="text-xs font-medium">{item.label}</span>
                </button>
            ))}
        </nav>
    );
}

