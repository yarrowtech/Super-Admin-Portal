import { useEffect, useState } from 'react';

// Single source of truth for time-of-day greetings (viewer's local clock).
// Bands: 05-11 morning, 12-16 afternoon, 17-20 evening, 21-04 night.
const BANDS = {
  morning: {
    greeting: 'Good morning',
    message: 'Wishing you a bright and productive day ahead.',
    roleMessage: (hint) => `Start the day strong — here's your ${hint}.`,
  },
  afternoon: {
    greeting: 'Good afternoon',
    message: 'Hope your day is going well — keep up the great momentum.',
    roleMessage: (hint) => `Hope your day is going well — here's your ${hint}.`,
  },
  evening: {
    greeting: 'Good evening',
    message: 'Wrapping up the day? Here is a calm view of where things stand.',
    roleMessage: (hint) => `Winding down? Here's a calm look at your ${hint}.`,
  },
  night: {
    greeting: 'Good night',
    message: 'Working late? Take a moment to rest too.',
    roleMessage: (hint) => `Working late? Here's your ${hint} — remember to rest too.`,
  },
};

export const getDayPart = (hour) => {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
};

/** Returns { greeting, message }. `roleHint` (e.g. 'financial overview') flavours the message. */
export const getGreetingParts = (date = new Date(), roleHint = '') => {
  const band = BANDS[getDayPart(date.getHours())];
  const hint = String(roleHint || '').trim();
  return {
    greeting: band.greeting,
    message: hint ? band.roleMessage(hint) : band.message,
  };
};

export const getFirstName = (user) => {
  if (!user) return '';
  const first = String(user.firstName || '').trim();
  if (first) return first;
  const fromName = String(user.name || '').trim().split(/\s+/)[0];
  if (fromName) return fromName;
  return user.email ? String(user.email).split('@')[0] : '';
};

/**
 * Returns a Date that only changes identity when the day-part band changes
 * (checked once a minute), so consumers re-render at most 4 times a day.
 */
export const useGreetingClock = () => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => {
      const next = new Date();
      setNow((prev) => (getDayPart(prev.getHours()) === getDayPart(next.getHours()) ? prev : next));
    }, 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
};
