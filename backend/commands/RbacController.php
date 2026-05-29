<?php

namespace app\commands;

use Yii;
use yii\console\Controller;
use yii\console\ExitCode;

class RbacController extends Controller
{
    /**
     * Initializes RBAC by creating roles and permissions.
     */
    public function actionInit()
    {
        $auth = Yii::$app->authManager;

        // Remove all existing roles and permissions
        $auth->removeAll();

        // Create permissions
        $manageInventory = $auth->createPermission('manageInventory');
        $manageInventory->description = 'Manage inventory items';
        $auth->add($manageInventory);

        $manageLabel = $auth->createPermission('manageLabel');
        $manageLabel->description = 'Manage labels';
        $auth->add($manageLabel);

        $manageStyling = $auth->createPermission('manageStyling');
        $manageStyling->description = 'Manage styling';
        $auth->add($manageStyling);

        // Create roles
        $admin = $auth->createRole('admin');
        $auth->add($admin);

        $editor = $auth->createRole('editor');
        $auth->add($editor);

        // Assign permissions to roles
        $auth->addChild($admin, $manageInventory);
        $auth->addChild($admin, $manageLabel);
        $auth->addChild($admin, $manageStyling);

        $auth->addChild($editor, $manageLabel);
        $auth->addChild($editor, $manageStyling);

        // Assign roles to users
        // Replace with actual user IDs from your 'authorized_users' table
        $auth->assign($admin, 1); // Assign 'admin' role to user with ID 1
        $auth->assign($editor, 2); // Assign 'editor' role to user with ID 2

        echo "RBAC roles and permissions have been successfully initialized.\n";

        return ExitCode::OK;
    }

    /**
     * Assigns a role to a user.
     * Usage: yii rbac/assign-role admin 3
     *
     * @param string $roleName The name of the role.
     * @param int $userId The ID of the user.
     * @return int Exit code
     */
    public function actionAssignRole($roleName, $userId)
    {
        $auth = Yii::$app->authManager;

        $role = $auth->getRole($roleName);
        if (!$role) {
            echo "Role '{$roleName}' does not exist.\n";
            return ExitCode::UNSPECIFIED_ERROR;
        }

        $user = Yii::$app->db->createCommand("SELECT id FROM authorized_users WHERE id = :id")
            ->bindValue(':id', $userId)
            ->queryOne();

        if (!$user) {
            echo "User with ID {$userId} does not exist in 'authorized_users' table.\n";
            return ExitCode::UNSPECIFIED_ERROR;
        }

        $auth->assign($role, $userId);
        echo "Role '{$roleName}' has been assigned to user ID {$userId}.\n";

        return ExitCode::OK;
    }

    /**
     * Revokes a role from a user.
     * Usage: yii rbac/revoke-role admin 3
     *
     * @param string $roleName The name of the role.
     * @param int $userId The ID of the user.
     * @return int Exit code
     */
    public function actionRevokeRole($roleName, $userId)
    {
        $auth = Yii::$app->authManager;

        $role = $auth->getRole($roleName);
        if (!$role) {
            echo "Role '{$roleName}' does not exist.\n";
            return ExitCode::UNSPECIFIED_ERROR;
        }

        $auth->revoke($role, $userId);
        echo "Role '{$roleName}' has been revoked from user ID {$userId}.\n";

        return ExitCode::OK;
    }
}
