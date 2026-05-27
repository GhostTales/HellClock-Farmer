import { CURRENCY_MAPPINGS } from '../constants';
import { formatTime } from '../utils/formatters';
import './CustomCurrencyTooltip.css';

export const CustomCurrencyTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const currencyNames = Object.values(CURRENCY_MAPPINGS).map((m: any) => m.name);
    const statsOrder = ['Gold', 'Soul Stones', 'Gold/m', 'Soul Stones/m'];

    // Filter out trendlines and moving averages from the tooltip
    const filteredPayload = payload.filter((entry: any) => {
      const name = String(entry.name);
      return !name.endsWith(' (Trend)') && !name.endsWith(' (5-MA)');
    });

    // Sort the payload to guarantee a consistent order
    const sortedPayload = [...filteredPayload].sort((a: any, b: any) => {
      if (a.name === 'Time') return -1;
      if (b.name === 'Time') return 1;

      const statIndexA = statsOrder.indexOf(a.name);
      const statIndexB = statsOrder.indexOf(b.name);
      if (statIndexA !== -1 && statIndexB !== -1) return statIndexA - statIndexB;
      if (statIndexA !== -1) return -1;
      if (statIndexB !== -1) return 1;

      const indexA = currencyNames.indexOf(a.name);
      const indexB = currencyNames.indexOf(b.name);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;

      return String(a.name).localeCompare(String(b.name));
    });

    return (
      <div className="custom-tooltip">
        <p className="custom-tooltip-title">{label}</p>
        {sortedPayload
          .filter((entry: any) => Number(entry.value) !== 0 || entry.name === 'Time')
          .map((entry: any, index: number) => {
          const name = entry.name;
          const value = Number(entry.value);
          
          if (name === 'Time') {
            return (
              <div key={index} className="custom-tooltip-row" style={{ color: entry.color }}>
                <span>{name}:</span>
                <span className="custom-tooltip-value">{formatTime(value)}</span>
              </div>
            );
          }

          // Check if this is a mapped currency
          const mapping = Object.values(CURRENCY_MAPPINGS).find((m: any) => m.name === name) as any;
          
          if (mapping) {
            const isTinkering = name.toLowerCase().includes('tinkering');
            const absValue = Math.abs(value);
            const full = Math.floor(absValue);
            const fragments = isTinkering ? 0 : Math.round((absValue - full) * 6);
            
            const isNegative = value < 0;
            const fullSign = (isNegative && (full > 0 || isTinkering)) ? '-' : '';
            const fragSign = isNegative ? '-' : '';

            return (
              <div key={index} className="custom-tooltip-row" style={{ color: entry.color }}>
                <div className="custom-tooltip-group">
                  {mapping.texture && <img src={mapping.texture} alt={name} className="custom-tooltip-icon" />}
                  <span className="custom-tooltip-value mapped">
                    {fullSign}{isTinkering ? absValue.toLocaleString(undefined, { maximumFractionDigits: 3 }) : full.toLocaleString()}
                  </span>
                </div>
                {!isTinkering && (
                  <div className="custom-tooltip-group fragment">
                    <img src={mapping.fragmentTexture} alt={`Fragment`} className="custom-tooltip-icon" />
                    <span className="custom-tooltip-fragment-text">{fragSign}{fragments}</span>
                  </div>
                )}
              </div>
            );
          }

          // Fallback for Gold, Soul Stones, or unknown currencies
          return (
            <div key={index} className="custom-tooltip-row" style={{ color: entry.color }}>
              <span>{name}:</span>
              <span className="custom-tooltip-value">
                {value.toLocaleString(undefined, { maximumFractionDigits: 3 })}
              </span>
            </div>
          );
        })}
      </div>
    );
  }
  return null;
};