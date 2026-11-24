let locks = 0;
let previousOverflow = '';
const dialogs = [];

export const registerDialog = (element) => {
  dialogs.push(element);
  return {
    isTop: () => dialogs.at(-1) === element,
    release: () => { const index = dialogs.lastIndexOf(element); if (index >= 0) dialogs.splice(index, 1); },
  };
};

export const lockBodyScroll = () => {
  if (locks === 0) {
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  locks += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    locks -= 1;
    if (locks === 0) document.body.style.overflow = previousOverflow;
  };
};
