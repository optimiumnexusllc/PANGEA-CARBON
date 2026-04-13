'use client';
import { useState } from 'react';

export default function AccountPage() {
  const [tab, setTab] = useState('profile');
  return (
    <div style={{ padding: 24 }}>
      <h1>Mon Compte</h1>
      <p>Onglet actif: {tab}</p>
      <button onClick={() => setTab('security')}>Securite</button>
    </div>
  );
}
