export function getValidDate (str: string, unixTime = false) {
  const date = new Date(str);
  const value = date.valueOf();
  return isNaN(value)
    ? str
    : (unixTime
      ? Math.floor(value / 1000)
      : value);
}
