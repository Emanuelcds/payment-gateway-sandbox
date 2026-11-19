CREATE TABLE IF NOT EXISTS `pedidos` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `usuario_id` INT UNSIGNED NOT NULL,
    `projeto_id` INT UNSIGNED NOT NULL,
    `id_api` VARCHAR(255) NULL UNIQUE,
    `valor` DECIMAL(10,2) NOT NULL,
    `dt_pedido` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `status` ENUM('pendente', 'confirmado', 'cancelado', 'falha', 'reembolsado') NOT NULL DEFAULT 'pendente',
    PRIMARY KEY (`id`),
    KEY `idx_pedidos_projeto_id` (`projeto_id`),
    KEY `idx_pedidos_status_dt_pedido` (`status`, `dt_pedido`),
    CONSTRAINT `fk_pedidos_usuario`
        FOREIGN KEY (`usuario_id`) REFERENCES `usuario` (`id`)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT `fk_pedidos_projeto`
        FOREIGN KEY (`projeto_id`) REFERENCES `projetos` (`id`)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT `ck_pedidos_valor` CHECK (`valor` >= 0),    
    CONSTRAINT `uq_pedidos_repetidos` UNIQUE (`usuario_id`, `projeto_id`) 
) ENGINE=InnoDB;