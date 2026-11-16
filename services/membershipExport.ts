
interface ExportOptions {
  membershipId: number;
  fileName?: string;
  token: string;
}

export const downloadMembershipExcel = async ({
  membershipId,
  fileName = `membership_${membershipId}_report`,
  token,
}: ExportOptions): Promise<void> => {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/membership/${membershipId}/excel`,
      {
        method: 'GET',
        headers: { token },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to generate Excel');
    }

    const blob = await response.blob();
    triggerDownload(blob, `${fileName}.xlsx`);
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to download Excel');
  }
};


const triggerDownload = (blob: Blob, fileName: string): void => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};
