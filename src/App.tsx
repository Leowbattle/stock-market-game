import { useRef, useEffect, useState } from 'react'
import './App.css'
import * as d3 from 'd3';

const INITIAL_PRICE = 100;
const NT = 252;

// Generate a random normal variable using Box-Muller transform
function random_normal() {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

// Generate a stock price path using the geometric Brownian motion model
function stock_path(nt: number, dt: number, m: number, s: number) {
  const S = new Array(nt + 1).fill(0);
  S[0] = INITIAL_PRICE;

  for (let i = 0; i < nt; i++) {
    const z = random_normal();
    S[i + 1] = S[i] * Math.exp((m - 0.5 * s ** 2) * dt + s * Math.sqrt(dt) * z);
  }

  return S;
}

function App() {
  function generate_path() {
    const drift = Math.random() > 0.5 ? Math.log(1 + aParameter) : Math.log(1 - aParameter);
    setDrift(drift);
    return stock_path(NT, 1 / NT, drift, volatility);
  }

  const INITIAL_BALANCE = 100;
  const [volatility, setVolatility] = useState<number>(0.2);
  const [aParameter, setAParameter] = useState<number>(0.3);
  const [drift, setDrift] = useState<number>(0);
  const [R, setR] = useState<number>(10); // Stop loss percentage

  const [balance, setBalance] = useState<number>(INITIAL_BALANCE);
  const [sold, setSold] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<'profit' | 'loss' | null>(null);

  const [path, setPath] = useState<number[]>([]);
  const [time, setTime] = useState<number>(0);
  const [playing, setPlaying] = useState<boolean>(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const intervalRef = useRef(null);
  const [balanceHistory, setBalanceHistory] = useState<number[]>([INITIAL_BALANCE]);

  useEffect(() => {
    if (svgRef.current) {
      const svg = d3.select(svgRef.current);
      svg.selectAll("*").remove();

      const width = 800;
      const height = 600;
      const margin = { top: 30, right: 30, bottom: 50, left: 60 };

      const prices = path.slice(0, time);

      // const yMin = (d3.min(prices) || 0) - 10;
      // const yMax = (d3.max(prices) || 1) + 10;

      const m = Math.log(1 + aParameter);
      const s = volatility;
      
      // const yMin = path[0] * Math.exp(m - 0.5 * s ** 2 - 3.5 * s);
      const yMin = 0;
      const yMax = INITIAL_PRICE * Math.exp(m - 0.5 * s ** 2 + 3.5 * s);

      const x = d3.scaleLinear().domain([0, NT - 1]).range([margin.left, width - margin.right]);
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

      const stopLoss = INITIAL_PRICE * (1 - R / 100);
      svg.append("line")
        .attr("x1", margin.left)
        .attr("x2", width - margin.right)
        .attr("y1", y(stopLoss))
        .attr("y2", y(stopLoss))
        .attr("stroke", "red")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "6,4");
      svg.append("text")
        .attr("x", width - margin.right - 5)
        .attr("y", y(stopLoss) - 8)
        .attr("text-anchor", "end")
        .attr("fill", "red")
        .attr("font-size", 14)
        .text(`Stop Loss (${R}%)`);
    }
  }, [path, time, R, volatility, aParameter]);

  // Sell logic: sell if stop loss triggers or round ends
  useEffect(() => {
    if (!playing || sold || path.length === 0) return;
    const stopLoss = path[0] * (1 - R / 100);
    let profit = false;
    if (time < path.length && path[time] <= stopLoss) {
      // Sold at stop loss
      profit = path[time] > path[0];
      setBalance(bal => {
        const newBalance = bal + path[time];
        setBalanceHistory(hist => {
          if (hist[hist.length - 1] !== newBalance) {
            return [...hist, newBalance];
          }
          return hist;
        });
        return newBalance;
      });
      setSold(true);
      setPlaying(false);
      setLastResult(profit ? 'profit' : 'loss');
    } else if (time === path.length - 1) {
      // Sold at end of round
      profit = path[time] > path[0];
      setBalance(bal => {
        const newBalance = bal + path[time];
        setBalanceHistory(hist => {
          if (hist[hist.length - 1] !== newBalance) {
            return [...hist, newBalance];
          }
          return hist;
        });
        return newBalance;
      });
      setSold(true);
      setPlaying(false);
      setLastResult(profit ? 'profit' : 'loss');
    }
  }, [playing, time, path, R]);

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
      }, 1);
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
    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', width: '100%' }}>
      <div>
        <div style={{ marginBottom: 12, fontSize: 20, color: lastResult === 'profit' ? 'blue' : lastResult === 'loss' ? 'red' : 'black' }}>
          Account Balance: ${balance.toFixed(2)}
        </div>
        <svg ref={svgRef} width="800" height="600" />
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'row', gap: '24px', maxWidth: 900, alignItems: 'center', justifyContent: 'center', marginLeft: 'auto', marginRight: 'auto' }}>
          <label style={{ display: 'flex', alignItems: 'center', minWidth: 180 }}>
            <span style={{ minWidth: 70, display: 'inline-block' }}>A: {aParameter.toFixed(2)}</span>
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
              style={{ marginLeft: 8, width: 100 }}
            />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', minWidth: 180 }}>
            <span style={{ minWidth: 70, display: 'inline-block' }}>Volatility: {volatility.toFixed(2)}</span>
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
              style={{ marginLeft: 8, width: 100 }}
            />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', minWidth: 180 }}>
            <span style={{ minWidth: 70, display: 'inline-block' }}>R: {R.toFixed(0)}%</span>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={R}
              onChange={e => {
                setR(parseInt(e.target.value));
              }}
              style={{ marginLeft: 8, width: 100 }}
            />
          </label>
        </div>
        <div style={{ marginTop: 16 }}>
          <button
            onClick={() => {
              if (time >= path.length || sold) {
                const newPath = generate_path();
                setPath(newPath);
                setTime(0);
                setSold(false);
                setLastResult(null);
                if (newPath.length > 0) {
                  setBalance(bal => bal - newPath[0]);
                }
              }
              setPlaying(true);
            }}
            // disabled={playing}
          >Play</button>
          <button onClick={() => setPlaying(false)} disabled={!playing}>Pause</button>
        </div>
      </div>
      <div>
        <BalanceChart balanceHistory={balanceHistory} />
      </div>
    </div>
  )
}

function BalanceChart({ balanceHistory }: { balanceHistory: number[] }) {
  const chartRef = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const width = 400;
    const height = 300;
    const margin = { top: 30, right: 30, bottom: 50, left: 60 };
    const svg = d3.select(chartRef.current);
    svg.selectAll('*').remove();
    if (balanceHistory.length < 2) return;
    const x = d3.scaleLinear().domain([0, balanceHistory.length - 1]).range([margin.left, width - margin.right]);
    const y = d3.scaleLinear().domain([d3.min(balanceHistory) ?? 0, d3.max(balanceHistory) ?? 1]).range([height - margin.bottom, margin.top]);
    svg.append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x));
    svg.append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(y));
    svg.append('path')
      .datum(balanceHistory)
      .attr('fill', 'none')
      .attr('stroke', 'blue')
      .attr('stroke-width', 2)
      .attr('d', d3.line<number>()
        .x((d, i) => x(i))
        .y(d => y(d))
      );
  }, [balanceHistory]);
  return <svg ref={chartRef} width={400} height={300} />;
}

export default App;
