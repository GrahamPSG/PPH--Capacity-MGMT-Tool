# PRP-026: Mobile Optimization

## Status
🔲 Not Started

## Priority
P2 - Medium (User experience enhancement)

## Objective
Optimize the application for mobile devices with touch-friendly UI, responsive breakpoints, performance optimizations, and mobile-specific features for field workers.

## Scope

### Files to Create
- `src/components/mobile/MobileNav.tsx` - Mobile navigation drawer
- `src/components/mobile/BottomNav.tsx` - Bottom navigation bar
- `src/components/mobile/TouchOptimized.tsx` - Touch-optimized wrappers
- `src/components/mobile/MobileFilters.tsx` - Mobile filter sheet
- `src/components/mobile/SwipeActions.tsx` - Swipe gesture actions
- `src/components/mobile/MobileSearch.tsx` - Mobile search overlay
- `src/hooks/useTouchGestures.ts` - Touch gesture handling
- `src/hooks/useViewport.ts` - Viewport detection hook
- `src/lib/mobile/gestures.ts` - Gesture utilities
- `src/lib/mobile/haptics.ts` - Haptic feedback utilities
- `src/styles/mobile.css` - Mobile-specific styles
- `tests/mobile/touch-gestures.test.ts` - Gesture tests
- `tests/mobile/responsive.test.tsx` - Responsive tests

### Dependencies to Install
```bash
npm install react-swipeable
npm install use-resize-observer
npm install react-spring
```

## Implementation Steps

1. **Implement Responsive Breakpoints**
   - Define breakpoints: mobile (<640px), tablet (640-1024px), desktop (>1024px)
   - Use Tailwind responsive utilities
   - Test all components at each breakpoint
   - Adjust layouts for portrait and landscape
   - Support foldable devices

2. **Create Touch-Optimized UI**
   - Minimum touch target size: 44x44px (Apple) / 48x48px (Google)
   - Increase button sizes on mobile
   - Add spacing between interactive elements
   - Larger form inputs and dropdowns
   - Easy-to-tap navigation
   - Avoid hover-only interactions

3. **Build Mobile Navigation**
   - Hamburger menu with slide-out drawer
   - Bottom navigation for primary actions
   - Sticky headers and footers
   - Breadcrumb navigation
   - Back button support
   - Deep linking

4. **Implement Touch Gestures**
   - Swipe left/right to delete or archive
   - Pull to refresh on lists
   - Pinch to zoom on Gantt chart
   - Long press for context menu
   - Tap outside to close modals
   - Double tap to zoom

5. **Optimize Performance for Mobile**
   - Code splitting for faster initial load
   - Lazy load images and components
   - Reduce bundle size (<200KB gzipped)
   - Optimize images (WebP format)
   - Minimize JavaScript execution
   - Use CSS transforms for animations (GPU accelerated)

6. **Create Mobile-Specific Components**
   - Mobile filter drawer (vs desktop dropdown)
   - Mobile date picker (native input type="date")
   - Mobile search overlay (fullscreen)
   - Bottom sheet for actions
   - Mobile card layouts
   - Accordion for collapsible sections

7. **Add Haptic Feedback**
   - Vibration on button press
   - Different vibration patterns for actions
   - Success/error haptic feedback
   - Long press vibration
   - User preference to disable

8. **Implement Offline-First Features**
   - Cache data for offline viewing
   - Queue actions during offline
   - Sync when back online
   - Show offline indicator
   - Graceful degradation

9. **Optimize Forms for Mobile**
   - Appropriate input types (tel, email, number)
   - Auto-focus on form load
   - Show/hide keyboard intelligently
   - Floating labels
   - Inline validation
   - Large submit buttons

10. **Test on Real Devices**
    - Test on iOS (iPhone 13+)
    - Test on Android (Pixel, Samsung)
    - Test on tablets (iPad, Android tablets)
    - Test in portrait and landscape
    - Test with different font sizes
    - Test with accessibility features (VoiceOver, TalkBack)

## Acceptance Criteria

- [ ] All interactive elements meet minimum touch target size (44x44px)
- [ ] App responds correctly to mobile, tablet, desktop breakpoints
- [ ] Mobile navigation with drawer and bottom nav works smoothly
- [ ] Touch gestures (swipe, pull-to-refresh, pinch) implemented
- [ ] Page load time on 3G network <3 seconds
- [ ] JavaScript bundle size <200KB gzipped
- [ ] Forms optimized with correct input types and validation
- [ ] Haptic feedback provides tactile response on mobile
- [ ] Offline mode allows viewing cached data
- [ ] All components tested on iOS and Android devices
- [ ] Lighthouse mobile score >90
- [ ] All tests pass with >80% coverage

## Validation Steps

```bash
# 1. Install mobile dependencies
npm install react-swipeable use-resize-observer react-spring

# 2. Run responsive tests
npm test -- tests/mobile/responsive.test.tsx

# 3. Start dev server
npm run dev

# 4. Test responsive breakpoints
# Resize browser to mobile width (375px)
# Verify layout adapts correctly
# Test at 640px (tablet)
# Test at 1024px (desktop)

# 5. Test on real mobile device
# Get local IP: ifconfig (Mac/Linux) or ipconfig (Windows)
# Visit http://[YOUR_IP]:3000 on mobile device
# Verify app loads and functions correctly

# 6. Test touch targets
# Use Chrome DevTools -> More Tools -> Rendering
# Enable "Emulate a focused page" and "Show rulers"
# Verify all buttons are at least 44x44px

# 7. Test mobile navigation
# Open hamburger menu
# Verify drawer slides in smoothly
# Test bottom navigation
# Verify navigation works correctly

# 8. Test touch gestures
# Swipe left on project card to delete
# Pull down on project list to refresh
# Long press on project to open context menu
# Verify gestures work smoothly

# 9. Test performance
npm run lighthouse:mobile
# Target: Performance score >90
# Check bundle size
npm run analyze
# Target: <200KB gzipped

# 10. Test forms on mobile
# Open project form on mobile
# Verify keyboard appears with correct type
# Test auto-complete
# Test validation

# 11. Test haptic feedback
# On physical device, tap buttons
# Verify vibration occurs
# Test long press vibration

# 12. Test offline mode
# Enable offline in DevTools
# Navigate app
# Verify cached data loads
# Create project (should queue)
# Go online
# Verify queued actions sync

# 13. Test on iOS device
# Use Safari on iPhone
# Test all features
# Verify PWA install works

# 14. Test on Android device
# Use Chrome on Android
# Test all features
# Verify PWA install works

# 15. Run accessibility tests
npm run test:a11y:mobile
# Test with screen reader (VoiceOver/TalkBack)
```

## Expected Output

```
✓ Responsive breakpoints for mobile, tablet, desktop
✓ Touch-optimized UI with 44x44px minimum targets
✓ Mobile navigation with drawer and bottom nav
✓ Touch gestures (swipe, pull-to-refresh, pinch)
✓ Mobile performance optimized (<3s load on 3G)
✓ JavaScript bundle <200KB gzipped
✓ Mobile-specific components (filters, search, sheets)
✓ Haptic feedback for tactile responses
✓ Offline-first features with data caching
✓ Forms optimized for mobile input
✓ Lighthouse mobile score >90
✓ All tests passing (>80% coverage)
```

## Responsive Breakpoints

```typescript
// tailwind.config.js
module.exports = {
  theme: {
    screens: {
      'sm': '640px',  // Mobile landscape, small tablets
      'md': '768px',  // Tablets
      'lg': '1024px', // Laptops
      'xl': '1280px', // Desktops
      '2xl': '1536px' // Large desktops
    }
  }
}
```

## Touch Target Sizes

```css
/* Minimum touch targets */
.btn-mobile {
  min-width: 44px;
  min-height: 44px;
  padding: 12px 16px;
}

.nav-item-mobile {
  padding: 16px;
  min-height: 48px;
}

/* Spacing between touch targets */
.touch-list > * + * {
  margin-top: 8px;
}
```

## Performance Budget

```javascript
// Target metrics for mobile (3G)
const PERFORMANCE_BUDGET = {
  firstContentfulPaint: 1800, // 1.8s
  largestContentfulPaint: 2500, // 2.5s
  timeToInteractive: 3800, // 3.8s
  totalBlockingTime: 300, // 300ms
  cumulativeLayoutShift: 0.1, // 0.1
  totalBundleSize: 200 * 1024, // 200KB gzipped
  imageSize: 100 * 1024 // 100KB per image max
}
```

## Related PRPs
- Depends on: PRP-023 (Project UI Components), PRP-025 (PWA Configuration)
- Related: PRP-022 (Capacity Dashboard), PRP-021 (Gantt Chart)
- Blocks: None (enhancement to existing features)

## Estimated Time
10-12 hours

## Notes
- Test on real devices, not just browser DevTools emulation
- Consider network conditions (3G, 4G, WiFi) for testing
- Use Chrome DevTools Network throttling for performance testing
- Support both iOS Safari and Android Chrome
- Consider tablet-specific layouts (not just scaled mobile/desktop)
- Use native controls where possible (native date picker, etc.)
- Avoid fixed positioning that conflicts with virtual keyboard
- Test with different keyboard types (default, numeric, email, etc.)
- Consider right-to-left (RTL) languages for international users
- Support landscape orientation (especially for tablets)
- Use CSS `env(safe-area-inset-*)` for notch support (iPhone X+)
- Consider foldable devices (Galaxy Fold, Surface Duo)
- Implement pull-to-refresh with care (avoid conflicts with scrolling)
- Use `touch-action` CSS property to prevent unwanted gestures
- Consider battery usage (minimize animations, reduce network requests)

## Mobile-Specific Features
- **Camera Integration**: Scan documents, capture photos
- **Geolocation**: Track job site check-ins
- **Native Share**: Share project reports
- **Biometric Auth**: Fingerprint/Face ID login
- **QR Code Scanning**: Scan equipment/materials

## Rollback Plan
If validation fails:
1. Check Tailwind responsive utilities applied correctly
2. Test touch target sizes with Chrome DevTools ruler
3. Verify mobile navigation components render correctly
4. Test gestures independently before integration
5. Check performance with Lighthouse mobile audit
6. Verify bundle size with webpack-bundle-analyzer
7. Test on actual devices (iOS and Android)
8. Review mobile-specific CSS for conflicts
9. Check viewport meta tag configured correctly
10. Test offline mode independently from other features
