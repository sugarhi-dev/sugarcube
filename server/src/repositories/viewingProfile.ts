export function viewingProfile(accountParam: string): string {
    return `user_work_profile_id = (SELECT viewing_work_profile_id FROM user_account WHERE id = ${accountParam})`;
}
