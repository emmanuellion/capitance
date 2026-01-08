import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { RealtimePriceIndicator } from './RealtimePriceIndicator';

describe('RealtimePriceIndicator', () => {
  describe('Price Display', () => {
    it('should display current price when no realtime data', () => {
      render(<RealtimePriceIndicator currentPrice={150.0} />);

      expect(screen.getByText(/150\.00/)).toBeInTheDocument();
      expect(screen.getByText(/€/)).toBeInTheDocument();
    });

    it('should display realtime price when available', () => {
      render(
        <RealtimePriceIndicator
          currentPrice={150.0}
          realtimePrice={155.0}
          priceDifference={5.0}
        />
      );

      expect(screen.getByText(/155\.00/)).toBeInTheDocument();
      expect(screen.queryByText(/150\.00/)).not.toBeInTheDocument();
    });

    it('should display custom currency', () => {
      render(
        <RealtimePriceIndicator
          currentPrice={150.0}
          currency="USD"
        />
      );

      expect(screen.getByText(/USD/)).toBeInTheDocument();
      expect(screen.queryByText(/€/)).not.toBeInTheDocument();
    });

    it('should format price with 2 decimals', () => {
      render(<RealtimePriceIndicator currentPrice={150.123456} />);

      expect(screen.getByText(/150\.12/)).toBeInTheDocument();
    });
  });

  describe('Positive Price Change', () => {
    it('should show green indicator for positive change', () => {
      const { container } = render(
        <RealtimePriceIndicator
          currentPrice={150.0}
          realtimePrice={155.0}
          priceDifference={5.0}
          priceDifferencePercentage={3.33}
        />
      );

      const indicator = container.querySelector('.bg-green-100');
      expect(indicator).toBeInTheDocument();
      // Check for price change within the indicator
      expect(within(indicator as HTMLElement).getByText(/5\.00/)).toBeInTheDocument();
    });

    it('should show up arrow for positive change', () => {
      const { container } = render(
        <RealtimePriceIndicator
          currentPrice={150.0}
          realtimePrice={155.0}
          priceDifference={5.0}
        />
      );

      // ArrowUp icon is rendered
      const upArrow = container.querySelector('svg.lucide-arrow-up');
      expect(upArrow).toBeInTheDocument();
    });

    it('should show percentage for positive change', () => {
      render(
        <RealtimePriceIndicator
          currentPrice={150.0}
          realtimePrice={155.0}
          priceDifference={5.0}
          priceDifferencePercentage={3.33}
          showPercentage={true}
        />
      );

      expect(screen.getByText(/3\.33%/)).toBeInTheDocument();
    });

    it('should hide percentage when showPercentage is false', () => {
      render(
        <RealtimePriceIndicator
          currentPrice={150.0}
          realtimePrice={155.0}
          priceDifference={5.0}
          priceDifferencePercentage={3.33}
          showPercentage={false}
        />
      );

      expect(screen.queryByText(/%/)).not.toBeInTheDocument();
    });
  });

  describe('Negative Price Change', () => {
    it('should show red indicator for negative change', () => {
      const { container } = render(
        <RealtimePriceIndicator
          currentPrice={150.0}
          realtimePrice={145.0}
          priceDifference={-5.0}
          priceDifferencePercentage={-3.33}
        />
      );

      const indicator = container.querySelector('.bg-red-100');
      expect(indicator).toBeInTheDocument();
      // Check for price change within the indicator
      expect(within(indicator as HTMLElement).getByText(/5\.00/)).toBeInTheDocument(); // Shows absolute value
    });

    it('should show down arrow for negative change', () => {
      const { container } = render(
        <RealtimePriceIndicator
          currentPrice={150.0}
          realtimePrice={145.0}
          priceDifference={-5.0}
        />
      );

      // ArrowDown icon is rendered
      const downArrow = container.querySelector('svg.lucide-arrow-down');
      expect(downArrow).toBeInTheDocument();
    });

    it('should show absolute percentage for negative change', () => {
      render(
        <RealtimePriceIndicator
          currentPrice={150.0}
          realtimePrice={145.0}
          priceDifference={-5.0}
          priceDifferencePercentage={-3.33}
          showPercentage={true}
        />
      );

      expect(screen.getByText(/3\.33%/)).toBeInTheDocument(); // Absolute value
    });
  });

  describe('Zero Price Change', () => {
    it('should show gray indicator for zero change', () => {
      const { container } = render(
        <RealtimePriceIndicator
          currentPrice={150.0}
          realtimePrice={150.0}
          priceDifference={0}
          priceDifferencePercentage={0}
        />
      );

      const indicator = container.querySelector('.bg-gray-100');
      expect(indicator).toBeInTheDocument();
      // Check for "0.00 €" within the indicator
      expect(within(indicator as HTMLElement).getByText(/0\.00\s+€/)).toBeInTheDocument();
    });

    it('should show minus icon for zero change', () => {
      const { container } = render(
        <RealtimePriceIndicator
          currentPrice={150.0}
          realtimePrice={150.0}
          priceDifference={0}
        />
      );

      // Minus icon is rendered
      const minusIcon = container.querySelector('svg.lucide-minus');
      expect(minusIcon).toBeInTheDocument();
    });
  });

  describe('Live Indicator', () => {
    it('should show live indicator when realtime data is available', () => {
      render(
        <RealtimePriceIndicator
          currentPrice={150.0}
          realtimePrice={155.0}
          priceDifference={5.0}
        />
      );

      expect(screen.getByText('Live')).toBeInTheDocument();
    });

    it('should show pulsing dot when realtime data is available', () => {
      const { container } = render(
        <RealtimePriceIndicator
          currentPrice={150.0}
          realtimePrice={155.0}
          priceDifference={5.0}
        />
      );

      const pulsingDot = container.querySelector('.animate-pulse.bg-green-500');
      expect(pulsingDot).toBeInTheDocument();
    });

    it('should not show live indicator when no realtime data', () => {
      render(<RealtimePriceIndicator currentPrice={150.0} />);

      expect(screen.queryByText('Live')).not.toBeInTheDocument();
    });

    it('should not show live indicator when realtimePrice is null', () => {
      render(
        <RealtimePriceIndicator
          currentPrice={150.0}
          realtimePrice={null as any}
        />
      );

      expect(screen.queryByText('Live')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle realtime price without price difference', () => {
      render(
        <RealtimePriceIndicator
          currentPrice={150.0}
          realtimePrice={155.0}
        />
      );

      expect(screen.getByText(/155\.00/)).toBeInTheDocument();
      expect(screen.getByText('Live')).toBeInTheDocument();
      // No change indicator because priceDifference is undefined
    });

    it('should show neutral indicator when priceDifference is undefined', () => {
      const { container } = render(
        <RealtimePriceIndicator
          currentPrice={150.0}
          realtimePrice={155.0}
        />
      );

      const greenIndicator = container.querySelector('.bg-green-100');
      const redIndicator = container.querySelector('.bg-red-100');
      const grayIndicator = container.querySelector('.bg-gray-100');

      // When priceDifference is undefined, it defaults to 0, showing neutral indicator
      expect(greenIndicator).not.toBeInTheDocument();
      expect(redIndicator).not.toBeInTheDocument();
      expect(grayIndicator).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <RealtimePriceIndicator
          currentPrice={150.0}
          className="custom-class"
        />
      );

      const wrapper = container.querySelector('.custom-class');
      expect(wrapper).toBeInTheDocument();
    });

    it('should handle very small price changes', () => {
      const { container } = render(
        <RealtimePriceIndicator
          currentPrice={150.0}
          realtimePrice={150.01}
          priceDifference={0.01}
          priceDifferencePercentage={0.01}
        />
      );

      // Check for the realtime price
      expect(screen.getByText(/150\.01/)).toBeInTheDocument();
      // Check for percentage in the indicator
      expect(screen.getByText(/0\.01%/)).toBeInTheDocument();
    });

    it('should handle very large price changes', () => {
      render(
        <RealtimePriceIndicator
          currentPrice={100.0}
          realtimePrice={1000.0}
          priceDifference={900.0}
          priceDifferencePercentage={900.0}
        />
      );

      expect(screen.getByText(/1000\.00/)).toBeInTheDocument();
      // Check for percentage to distinguish from other 900.00
      expect(screen.getByText(/900\.00%/)).toBeInTheDocument();
    });

    it('should handle price of zero', () => {
      render(<RealtimePriceIndicator currentPrice={0} />);

      expect(screen.getByText(/0\.00/)).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should have correct dark mode classes for positive change', () => {
      const { container } = render(
        <RealtimePriceIndicator
          currentPrice={150.0}
          realtimePrice={155.0}
          priceDifference={5.0}
        />
      );

      const indicator = container.querySelector('.dark\\:bg-green-900\\/30');
      expect(indicator).toBeInTheDocument();
    });

    it('should have correct dark mode classes for negative change', () => {
      const { container } = render(
        <RealtimePriceIndicator
          currentPrice={150.0}
          realtimePrice={145.0}
          priceDifference={-5.0}
        />
      );

      const indicator = container.querySelector('.dark\\:bg-red-900\\/30');
      expect(indicator).toBeInTheDocument();
    });

    it('should have flex layout classes', () => {
      const { container } = render(
        <RealtimePriceIndicator currentPrice={150.0} />
      );

      const wrapper = container.querySelector('.flex.items-center.gap-2');
      expect(wrapper).toBeInTheDocument();
    });
  });
});
