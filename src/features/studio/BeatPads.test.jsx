import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import BeatPads from './BeatPads.jsx';

it('plays once for keyboard activation, assisted click and pointer activation', async () => {
  const onHit = vi.fn();
  const user = userEvent.setup();
  render(<BeatPads pads={[{ id: 'kick', label: 'Bombo' }]} teclas={['1']} onHit={onHit} />);
  const pad = screen.getByRole('button', { name: 'Pad 1: Bombo' });
  pad.focus();
  await user.keyboard('{Enter}');
  expect(onHit).toHaveBeenCalledTimes(1);
  await user.keyboard(' ');
  expect(onHit).toHaveBeenCalledTimes(2);
  fireEvent.click(pad, { detail: 0 });
  expect(onHit).toHaveBeenCalledTimes(3);
  pad.blur();
  await user.click(pad);
  expect(onHit).toHaveBeenCalledTimes(4);
  expect(pad).toHaveFocus();
});
