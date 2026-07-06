import { Request, Response } from 'express';
import prisma from '../config/db';

export async function createTemplate(req: Request, res: Response) {
  try {
    const { name, subject, body, channel, category, variables } = req.body;

    if (!name || !body || !channel || !category) {
      return res.status(400).json({ error: 'Name, body, channel, and category are required' });
    }

    const template = await prisma.notificationTemplate.create({
      data: {
        name,
        subject,
        body,
        channel,
        category,
        variables: variables || [],
      },
    });

    res.status(201).json(template);
  } catch (err: any) {
    console.error('Failed to create template:', err);
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'Template name must be unique' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getTemplates(req: Request, res: Response) {
  try {
    const templates = await prisma.notificationTemplate.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(templates);
  } catch (err) {
    console.error('Failed to fetch templates:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getTemplateDetails(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const template = await prisma.notificationTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(template);
  } catch (err) {
    console.error('Failed to fetch template details:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateTemplate(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { name, subject, body, channel, category, variables } = req.body;

    const template = await prisma.notificationTemplate.update({
      where: { id },
      data: {
        name,
        subject,
        body,
        channel,
        category,
        variables,
      },
    });

    res.json(template);
  } catch (err) {
    console.error('Failed to update template:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteTemplate(req: Request, res: Response) {
  try {
    const { id } = req.params;

    await prisma.notificationTemplate.delete({
      where: { id },
    });

    res.json({ message: 'Template deleted successfully' });
  } catch (err) {
    console.error('Failed to delete template:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
