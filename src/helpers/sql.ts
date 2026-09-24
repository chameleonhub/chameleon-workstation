// Escapes a value for interpolation into a single-quoted SQL string literal, per the get-local-db/
// post-local-db raw-SQL IPC contract documented in CLAUDE.md ("be careful with string interpolation
// of user-controlled values into queries"). Doubling embedded single quotes is the standard SQL
// escaping rule (e.g. O'Brien -> O''Brien) - without it, a value containing one breaks the query's
// own quoting and can silently corrupt or fail the write.
export const escapeSqlString = (value: string): string => value.replace(/'/g, "''");
