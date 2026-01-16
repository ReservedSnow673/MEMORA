import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { AccessibleToggle } from './AccessibleToggle';

describe('AccessibleToggle', () => {
  it('should render with label', () => {
    const { getByText } = render(
      <AccessibleToggle label="Toggle Setting" value={false} onValueChange={() => {}} />
    );
    expect(getByText('Toggle Setting')).toBeTruthy();
  });

  it('should call onValueChange when toggled', () => {
    const onValueChange = jest.fn();
    const { getByRole } = render(
      <AccessibleToggle label="Toggle" value={false} onValueChange={onValueChange} />
    );
    fireEvent(getByRole('switch'), 'valueChange', true);
    expect(onValueChange).toHaveBeenCalledWith(true);
  });

  it('should have switch accessibility role', () => {
    const { getByRole } = render(
      <AccessibleToggle label="Switch" value={false} onValueChange={() => {}} />
    );
    expect(getByRole('switch')).toBeTruthy();
  });

  it('should reflect checked state in accessibility', () => {
    const { getByRole, rerender } = render(
      <AccessibleToggle label="Toggle" value={false} onValueChange={() => {}} />
    );
    
    let toggle = getByRole('switch');
    expect(toggle.props.accessibilityState?.checked).toBe(false);

    rerender(
      <AccessibleToggle label="Toggle" value={true} onValueChange={() => {}} />
    );
    
    toggle = getByRole('switch');
    expect(toggle.props.accessibilityState?.checked).toBe(true);
  });

  it('should include on/off in accessibility label', () => {
    const { getByRole, rerender } = render(
      <AccessibleToggle label="Setting" value={false} onValueChange={() => {}} />
    );
    
    let toggle = getByRole('switch');
    expect(toggle.props.accessibilityLabel).toContain('off');

    rerender(
      <AccessibleToggle label="Setting" value={true} onValueChange={() => {}} />
    );
    
    toggle = getByRole('switch');
    expect(toggle.props.accessibilityLabel).toContain('on');
  });

  it('should have disabled state when disabled', () => {
    const onValueChange = jest.fn();
    const { getByRole } = render(
      <AccessibleToggle
        label="Disabled Toggle"
        value={false}
        onValueChange={onValueChange}
        disabled
      />
    );
    const toggle = getByRole('switch');
    expect(toggle.props.disabled).toBe(true);
    expect(toggle.props.accessibilityState?.disabled).toBe(true);
  });
});
