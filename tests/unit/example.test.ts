describe('Project Setup', () => {
  it('should pass basic test', () => {
    expect(true).toBe(true);
  });

  it('should have correct environment', () => {
    expect(process.env.NODE_ENV).toBeDefined();
  });

  it('should perform basic arithmetic', () => {
    expect(2 + 2).toBe(4);
  });
});
