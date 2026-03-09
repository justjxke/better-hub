import { beforeEach, describe, expect, it, mock } from "bun:test";

const userSettingsUpsertMock = mock();
const userSettingsUpdateMock = mock();
const userSettingsFindUniqueMock = mock();

const prismaMock = {
	userSettings: {
		upsert: userSettingsUpsertMock,
		update: userSettingsUpdateMock,
		findUnique: userSettingsFindUniqueMock,
	},
};

mock.module("./db", () => ({ prisma: prismaMock }));

describe("user-settings-store", () => {
	beforeEach(() => {
		userSettingsUpsertMock.mockReset();
		userSettingsUpdateMock.mockReset();
		userSettingsFindUniqueMock.mockReset();
	});

	it("persists and returns workspaceNewTabBehavior='duplicate' in updateUserSettings", async () => {
		userSettingsUpsertMock.mockResolvedValueOnce({
			userId: "u_123",
			updatedAt: "2026-01-01T00:00:00.000Z",
		});

		userSettingsUpdateMock.mockResolvedValueOnce({
			userId: "u_123",
			displayName: null,
			theme: "system",
			colorTheme: "zinc",
			colorMode: "dark",
			ghostModel: "auto",
			useOwnApiKey: false,
			openrouterApiKey: null,
			githubPat: null,
			codeThemeLight: "vitesse-light",
			codeThemeDark: "vitesse-black",
			codeFont: "default",
			codeFontSize: 13,
			onboardingDone: false,
			updatedAt: "2026-01-01T00:00:00.000Z",
			workspaceNewTabBehavior: "duplicate",
		});

		const { updateUserSettings } = await import("./user-settings-store");
		const result = await updateUserSettings("u_123", {
			workspaceNewTabBehavior: "duplicate",
		});

		expect(userSettingsUpsertMock).toHaveBeenCalledTimes(1);
		expect(userSettingsUpdateMock).toHaveBeenCalledTimes(1);
		expect(userSettingsUpdateMock).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { userId: "u_123" },
				data: expect.objectContaining({
					workspaceNewTabBehavior: "duplicate",
				}),
			}),
		);
		expect(result.workspaceNewTabBehavior).toBe("duplicate");
	});

	it("coerces missing workspaceNewTabBehavior to 'dashboard' in getUserSettings", async () => {
		userSettingsFindUniqueMock.mockResolvedValueOnce({
			userId: "u_123",
			displayName: null,
			theme: "system",
			colorTheme: "zinc",
			colorMode: "dark",
			ghostModel: "auto",
			useOwnApiKey: false,
			openrouterApiKey: null,
			githubPat: null,
			codeThemeLight: "vitesse-light",
			codeThemeDark: "vitesse-black",
			codeFont: "default",
			codeFontSize: 13,
			onboardingDone: false,
			updatedAt: "2026-01-01T00:00:00.000Z",
		});

		const { getUserSettings } = await import("./user-settings-store");
		const result = await getUserSettings("u_123");

		expect(userSettingsFindUniqueMock).toHaveBeenCalledTimes(1);
		expect(userSettingsFindUniqueMock).toHaveBeenCalledWith(
			expect.objectContaining({ where: { userId: "u_123" } }),
		);
		expect(result.workspaceNewTabBehavior).toBe("dashboard");
	});

	it("coerces invalid persisted workspaceNewTabBehavior to 'dashboard'", async () => {
		userSettingsFindUniqueMock.mockResolvedValueOnce({
			userId: "u_123",
			displayName: null,
			theme: "system",
			colorTheme: "zinc",
			colorMode: "dark",
			ghostModel: "auto",
			useOwnApiKey: false,
			openrouterApiKey: null,
			githubPat: null,
			codeThemeLight: "vitesse-light",
			codeThemeDark: "vitesse-black",
			codeFont: "default",
			codeFontSize: 13,
			onboardingDone: false,
			updatedAt: "2026-01-01T00:00:00.000Z",
			workspaceNewTabBehavior: "legacy",
		});

		const { getUserSettings } = await import("./user-settings-store");
		const result = await getUserSettings("u_123");

		expect(result.workspaceNewTabBehavior).toBe("dashboard");
	});
});
