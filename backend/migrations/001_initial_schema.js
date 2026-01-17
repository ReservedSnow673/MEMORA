exports.up = (pgm) => {
  pgm.createTable('devices', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    device_id: {
      type: 'varchar(255)',
      notNull: true,
      unique: true,
    },
    platform: {
      type: 'varchar(10)',
      notNull: true,
    },
    created_at: {
      type: 'timestamp',
      default: pgm.func('NOW()'),
    },
    last_sync_at: {
      type: 'timestamp',
    },
  });

  pgm.createTable('processing_state', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    device_id: {
      type: 'uuid',
      notNull: true,
      references: 'devices',
      onDelete: 'CASCADE',
    },
    image_hash: {
      type: 'varchar(64)',
      notNull: true,
    },
    status: {
      type: 'varchar(20)',
      notNull: true,
    },
    caption: {
      type: 'text',
    },
    model_used: {
      type: 'varchar(20)',
    },
    error_message: {
      type: 'text',
    },
    retry_count: {
      type: 'integer',
      default: 0,
    },
    created_at: {
      type: 'timestamp',
      default: pgm.func('NOW()'),
    },
    updated_at: {
      type: 'timestamp',
      default: pgm.func('NOW()'),
    },
    deleted_at: {
      type: 'timestamp',
    },
  });

  pgm.addConstraint('processing_state', 'unique_device_image', {
    unique: ['device_id', 'image_hash'],
  });

  pgm.createTable('caption_history', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    device_id: {
      type: 'uuid',
      notNull: true,
      references: 'devices',
      onDelete: 'CASCADE',
    },
    image_hash: {
      type: 'varchar(64)',
      notNull: true,
    },
    caption: {
      type: 'text',
      notNull: true,
    },
    model_used: {
      type: 'varchar(20)',
      notNull: true,
    },
    was_manual_edit: {
      type: 'boolean',
      default: false,
    },
    created_at: {
      type: 'timestamp',
      default: pgm.func('NOW()'),
    },
  });

  pgm.createTable('preferences', {
    device_id: {
      type: 'uuid',
      primaryKey: true,
      references: 'devices',
      onDelete: 'CASCADE',
    },
    background_enabled: {
      type: 'boolean',
      default: true,
    },
    ai_mode: {
      type: 'varchar(20)',
      default: 'on-device',
    },
    auto_process_new: {
      type: 'boolean',
      default: true,
    },
    process_existing: {
      type: 'boolean',
      default: false,
    },
    wifi_only: {
      type: 'boolean',
      default: true,
    },
    charging_only: {
      type: 'boolean',
      default: false,
    },
    updated_at: {
      type: 'timestamp',
      default: pgm.func('NOW()'),
    },
  });

  pgm.createTable('error_logs', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    device_id: {
      type: 'uuid',
      notNull: true,
      references: 'devices',
      onDelete: 'CASCADE',
    },
    error_type: {
      type: 'varchar(50)',
      notNull: true,
    },
    error_message: {
      type: 'text',
    },
    context: {
      type: 'jsonb',
    },
    created_at: {
      type: 'timestamp',
      default: pgm.func('NOW()'),
    },
  });

  pgm.createIndex('processing_state', ['device_id', 'updated_at']);
  pgm.createIndex('caption_history', ['device_id', 'created_at']);
  pgm.createIndex('error_logs', ['device_id', 'created_at']);
};

exports.down = (pgm) => {
  pgm.dropTable('error_logs');
  pgm.dropTable('preferences');
  pgm.dropTable('caption_history');
  pgm.dropTable('processing_state');
  pgm.dropTable('devices');
};
