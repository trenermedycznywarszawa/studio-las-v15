// Never retry a mutation automatically: legacy trainer inserts are not idempotent.
export async function writeThenRefresh(operation, refresh) {
  let result;
  try { result = await operation(); }
  catch (cause) {
    const error = new Error("Write failed", {cause});
    error.status = cause?.status;
    error.payload = cause?.payload;
    error.writeUncertain = !error.status || error.status >= 500 || error.status === 408;
    error.retryRefresh = refresh;
    throw error;
  }
  try { if (refresh) await refresh(result); }
  catch (cause) {
    const error = new Error("Saved, refresh failed", {cause});
    error.writeConfirmed = true;
    error.retryRefresh = () => refresh(result);
    throw error;
  }
  return result;
}
