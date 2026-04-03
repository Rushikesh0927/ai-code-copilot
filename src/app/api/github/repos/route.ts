import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { Octokit } from '@octokit/rest';

export async function GET() {
  try {
    const session: any = await getServerSession(authOptions);
    if (!session || !session.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const octokit = new Octokit({ auth: session.accessToken });

    // Fetch the authenticated user's repositories (sorted by recently updated)
    const res = await octokit.rest.repos.listForAuthenticatedUser({
      sort: 'updated',
      per_page: 50,
      affiliation: 'owner,collaborator' // Get repos they own or collaborate on
    });

    const repos = res.data.map(repo => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      html_url: repo.html_url,
      private: repo.private,
      updated_at: repo.updated_at
    }));

    return NextResponse.json({ repos });

  } catch (error: any) {
    console.error('Error fetching GitHub repos:', error);
    return NextResponse.json({ error: 'Failed to fetch repositories' }, { status: 500 });
  }
}
