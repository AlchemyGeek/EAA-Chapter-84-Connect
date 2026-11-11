// Completion restores an incomplete applicant without changing email history.
export function applicationCompletionUpdates(completedAt: string, expirationDate: string) {
  return {
    roster: {
      member_type: "Regular",
      current_standing: "Active",
      expiration_date: expirationDate,
      date_added: completedAt.slice(0, 10),
    },
    application: {
      processed: true,
      processed_at: completedAt,
      archived_at: null,
      archived_by: null,
      archived_by_name: null,
    },
  };
}