import { useRef, useEffect, useState } from 'react'
import './App.css'
import * as d3 from 'd3';

// Generate a random normal variable using Box-Muller transform
function random_normal() {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

// Generate a stock price path using the geometric Brownian motion model
function stock_path(nt: number, dt: number, m: number, s: number) {
  const S = new Array(nt + 1).fill(0);
  S[0] = 100;

  for (let i = 0; i < nt; i++) {
    const z = random_normal();
    S[i + 1] = S[i] * Math.exp((m - 0.5 * s ** 2) * dt + s * Math.sqrt(dt) * z);
  }

  return S;
}

function App() {
  function generate_path() {
    const drift = Math.random() > 0.5 ? Math.log(1 + aParameter) : Math.log(1 - aParameter);
    return stock_path(252, 1 / 252, drift, volatility);
  }

  const [volatility, setVolatility] = useState<number>(0.2);
  const [aParameter, setAParameter] = useState<number>(0.3);

  const [path, setPath] = useState<number[]>(generate_path());
  const [time, setTime] = useState<number>(0);
  const [playing, setPlaying] = useState<boolean>(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (svgRef.current) {
      const svg = d3.select(svgRef.current);
      svg.selectAll("*").remove();

      const width = 800;
      const height = 600;
      const margin = { top: 30, right: 30, bottom: 50, left: 60 };

      const prices = path.slice(0, time);

      const yMin = (d3.min(prices) || 0) - 10;
      const yMax = (d3.max(prices) || 1) + 10;

      const x = d3.scaleLinear().domain([0, path.length - 1]).range([margin.left, width - margin.right]);
      const y = d3.scaleLinear().domain([yMin, yMax]).range([height - margin.bottom, margin.top]);

      // X grid lines
      svg.append("g")
        .attr("class", "grid")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(
          d3.axisBottom(x)
            .tickSize(-(height - margin.top - margin.bottom))
            .tickFormat(() => "")
        )
        .selectAll("line")
        .attr("stroke", "#ddd");

      // Y grid lines
      svg.append("g")
        .attr("class", "grid")
        .attr("transform", `translate(${margin.left},0)`)
        .call(
          d3.axisLeft(y)
            .tickSize(-(width - margin.left - margin.right))
            .tickFormat(() => "")
        )
        .selectAll("line")
        .attr("stroke", "#ddd");

      // X axis
      svg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x));

      // Y axis
      svg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y));

      // Line
      svg.append("path")
        .datum(prices)
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 1.5)
        .attr("d", d3.line<number>()
          .x((d, i) => x(i))
          .y(d => y(d))
        );
    }
  }, [path, time]);

  useEffect(() => {
    if (playing && time < path.length) {
      intervalRef.current = setInterval(() => {
        setTime(t => {
          if (t < path.length) {
            return t + 1;
          } else {
            setPlaying(false);
            return t;
          }
        });
      }, 5);
    } else if (!playing && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [playing, path.length, time]);

  return (
    <>
      <svg ref={svgRef} width="800" height="600" />
      <div style={{ marginTop: 16 }}>
        <label style={{ marginRight: 16 }}>
          <span>A: {aParameter.toFixed(2)}</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={aParameter}
            onChange={e => {
              const newA = parseFloat(e.target.value);
              setAParameter(newA);
              setPath(generate_path());
              setTime(0);
              setPlaying(false);
            }}
            style={{ marginLeft: 8 }}
          />
        </label>
        <label style={{ marginRight: 16 }}>
          <span>Volatility: {volatility.toFixed(2)}</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volatility}
            onChange={e => {
              const newV = parseFloat(e.target.value);
              setVolatility(newV);
              setPath(generate_path());
              setTime(0);
              setPlaying(false);
            }}
            style={{ marginLeft: 8 }}
          />
        </label>
      </div>
      <div style={{ marginTop: 16 }}>
        <button onClick={() => setPlaying(true)} disabled={playing || time >= path.length}>Play</button>
        <button onClick={() => setPlaying(false)} disabled={!playing}>Pause</button>
        <button style={{ marginLeft: 12 }} onClick={() => { setPath(generate_path()); setTime(0); setPlaying(false); }}>Reset</button>
        <span style={{ marginLeft: 16 }}>Step: {time}</span>
      </div>
    </>
  )
}

export default App;
