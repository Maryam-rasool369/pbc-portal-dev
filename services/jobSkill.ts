import { JobSkill } from "@/types/jobSkill";

export async function fetchJobSkills(token: string): Promise<JobSkill[]> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/job-skill`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
  const data = await response.json();
  if (!response.ok || data.error) throw new Error(data?.error[0]?.msg || "Failed to fetch job skills");
  return data.data;
}

export async function addJobSkill(
  token: string,
  name: string,
): Promise<JobSkill> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/job-skill/add`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        token,
      },
      body: JSON.stringify({ name }),
    },
  );
  if (!response.ok) throw new Error("Failed to add job skill");
  const data = await response.json();
  return data.data;
}

export async function getJobSkillById(token: string, id: number) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/job-skill/${id}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        token,
      },
    },
  );
  const data = await response.json();
  if (!response.ok || data.error) throw new Error(data?.error[0]?.msg || "Failed to fetch job skills");
  return data.data;
}

export async function updateJobSkill(token: string, id: number, name: string) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/job-skill/${id}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        token,
      },
      body: JSON.stringify({ name }),
    },
  );
  if (!response.ok) throw new Error("Failed to update job skill");
  const data = await response.json();
  return data.data;
}
