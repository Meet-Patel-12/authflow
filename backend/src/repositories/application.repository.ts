import { Application, IApplication } from "../models/application.model";

export const findActiveApplicationByClientId = async (
  clientId: string,
): Promise<IApplication | null> => {
  return Application.findOne({ clientId, isActive: true }).select(
    "+clientSecret",
  );
};

export const findApplicationByOrigin = async (
  origin: string,
): Promise<IApplication | null> => {
  return Application.findOne({
    isActive: true,
    allowedOrigins: origin,
  });
};

export const findOrgApplications = async (organizationId: string) => {
  return Application.find({ organizationId, isActive: true }).sort({
    createdAt: -1,
  });
};

export const findOrgApplicationById = async (
  id: string,
  organizationId: string,
) => {
  return Application.findOne({ _id: id, organizationId, isActive: true });
};

export const findOrgApplicationByName = async (
  name: string,
  organizationId: string,
) => {
  return Application.findOne({ organizationId, name });
};

export const countOrgApplications = async (
  organizationId: string,
): Promise<number> => {
  return Application.countDocuments({ organizationId, isActive: true });
};

export const createApplication = async (data: {
  organizationId: string;
  name: string;
  type: string;
  description?: string;
  logo?: string;
  clientId: string;
  clientSecret: string;
}): Promise<IApplication> => {
  return Application.create(data);
};

export const saveApplication = async (
  app: IApplication,
): Promise<IApplication> => {
  return app.save();
};

export const deactivateApplication = async (
  app: IApplication,
): Promise<IApplication> => {
  app.isActive = false;
  return app.save();
};
