'use client'; 

import { useState, useEffect, useRef } from 'react'; // Adicionado useRef
import Link from 'next/link';
import './terminal.css'; 

export default function Home() {
  const [text, setText] = useState<string[]>([]);
  const [showButton, setShowButton] = useState(false);
  
  // Usamos useRef para guardar timeouts agendados (um por linha) e poder cancelar todos
  const timersRef = useRef<number[]>([]);

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
    if (timersRef.current.length) {
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current = [];
    }
    
    // 2. Mostra todo o texto imediatamente
    setText(bootSequence);
    
    // 3. Mostra o botão de entrar
    setShowButton(true);
  };

  useEffect(() => {
    // Agendamos um timeout por linha para evitar duplicação (Strict Mode remounts)
    timersRef.current = [];
    bootSequence.forEach((_, i) => {
      const t = window.setTimeout(() => {
        setText((prev) => [...prev, bootSequence[i]]);
        if (i === bootSequence.length - 1) setShowButton(true);
      }, i * 800);
      timersRef.current.push(t);
    });

    // Limpeza ao desmontar o componente
    return () => {
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current = [];
    };
  }, []);

  // Componente que pisca uma letra trocando para a fonte Sinais por 1s em intervalos aleatórios
  function SignalChar({ ch, idx }: { ch: string; idx: number }) {
    const [active, setActive] = useState(false);

    useEffect(() => {
      let mounted = true;
      let t1: number | undefined;
      let t2: number | undefined;

      const schedule = () => {
        // Próximo flash em 500ms..4500ms
        const delay = 500 + Math.random() * 4000;
        t1 = window.setTimeout(() => {
          if (!mounted) return;
          setActive(true);
          // Dura 1000ms
          t2 = window.setTimeout(() => {
            if (!mounted) return;
            setActive(false);
            schedule();
          }, 1000);
        }, delay);
      };

      schedule();

      return () => {
        mounted = false;
        if (t1) clearTimeout(t1);
        if (t2) clearTimeout(t2);
      };
    }, []);

    return (
      <span key={idx} className={`signal-char ${active ? 'sinais' : ''}`}>
        {ch}
      </span>
    );
  }

  // Renderiza cada linha transformando caracteres em SignalChar. Protege contra valores indefinidos.
  const renderLineChars = (line?: string) => {
    const str = String(line ?? '');
    return Array.from(str).map((ch, i) => <SignalChar ch={ch} idx={i} key={i} />);
  };

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
          <h1>// A INTERFACE</h1>
          <p className="subtext">Duga Radar Station - Chernobyl Exclusion Zone</p>
        </div>

        <div className="output-area">
          {text.map((line, index) => (
            <p key={index} className="line">
              <span className="prompt">{'>'}{'\u00A0'}</span>{renderLineChars(line)}
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