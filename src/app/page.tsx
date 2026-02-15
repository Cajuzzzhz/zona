'use client'; 

import { useState, useEffect, useRef } from 'react'; // Adicionado useRef
import Link from 'next/link';
import './terminal.css'; 

export default function Home() {
  const [text, setText] = useState<string[]>([]);
  const [showButton, setShowButton] = useState(false);
  
  // Usamos useRef para guardar o ID do intervalo e poder cancelar ele fora do useEffect
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const bootSequence = [
    "INICIANDO PROTOCOLO DUGA-2...",
    "---",
    "BUSCANDO HARDWARE COMPATÍVEL...",
    "ASSINATURA DE ASSIMILAÇÃO ENCONTRADA.",
    "BEM-VINDOS, ",
    "Chip",
    "Marcus",
    "Briana",
    "Sofia",
    "...",
    "SISTEMA PRONTO."
  ];

  // Função para pular a intro
  const skipIntro = () => {
    // 1. Para a animação
    if (intervalRef.current) clearInterval(intervalRef.current);
    
    // 2. Mostra todo o texto imediatamente
    setText(bootSequence);
    
    // 3. Mostra o botão de entrar
    setShowButton(true);
  };

  useEffect(() => {
    let lineIndex = 0;
    
    // Guardamos o intervalo na referência
    intervalRef.current = setInterval(() => {
      if (lineIndex < bootSequence.length) {
        setText((prev) => [...prev, bootSequence[lineIndex]]);
        lineIndex++;
      } else {
        setShowButton(true);
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    }, 800); 

    // Limpeza ao desmontar o componente
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <main className="crt-container">
      <div className="scanlines"></div>
      
      {/* Botão de Pular (Só aparece se a intro ainda não acabou) */}
      {!showButton && (
        <button onClick={skipIntro} className="skip-button">
          [ PULAR INTRODUÇÃO ]
        </button>
      )}
      
      <div className="terminal-content">
        <div className="header">
          <h1>// A INTERFACE v2.0.32</h1>
          <p className="subtext">Duga Radar Station - Chernobyl Exclusion Zone</p>
        </div>

        <div className="output-area">
          {text.map((line, index) => (
            <p key={index} className="line">
              <span className="prompt">{'>'}</span> {line}
            </p>
          ))}
          {!showButton && <span className="cursor">_</span>}
        </div>

        {showButton && (
          <div className="access-area">
            <p className="blink-warning">⚠ ACESSO RESTRITO ⚠</p>
            <Link href="/mapa" className="enter-button">
              [ INICIAR SINCRONIZAÇÃO ]
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}