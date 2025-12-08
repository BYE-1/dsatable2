package de.byedev.dsatable2.dsa_table_backend.config;

import org.apache.catalina.Context;
import org.apache.catalina.connector.Request;
import org.apache.catalina.connector.Response;
import org.apache.catalina.valves.ErrorReportValve;
import org.springframework.boot.web.embedded.tomcat.TomcatServletWebServerFactory;
import org.springframework.boot.web.server.WebServerFactoryCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration to fix classloader issues with Tomcat's error handling
 * when using nested JARs in Spring Boot 4.0.0.
 * 
 * The issue occurs when Tomcat tries to access RequestUtil from nested JARs.
 * This configuration ensures Spring Boot handles errors instead of Tomcat.
 */
@Configuration
public class TomcatConfig {

    @Bean
    public WebServerFactoryCustomizer<TomcatServletWebServerFactory> tomcatCustomizer() {
        return factory -> {
            factory.addContextCustomizers(context -> {
                // Remove existing error report valve that uses RequestUtil
                context.getPipeline().getValves().removeIf(v -> v instanceof ErrorReportValve);
                
                // Add a custom error report valve that doesn't use RequestUtil
                // This prevents the NoClassDefFoundError
                ErrorReportValve errorReportValve = new ErrorReportValve() {
                    @Override
                    protected void report(Request request, Response response, Throwable throwable) {
                        // Override to prevent RequestUtil usage
                        // Spring Boot's error handling will handle the error instead
                        // Just set status without trying to use RequestUtil
                        if (response != null && !response.isCommitted()) {
                            response.setStatus(response.getStatus());
                        }
                    }
                };
                errorReportValve.setShowReport(false);
                errorReportValve.setShowServerInfo(false);
                context.getPipeline().addValve(errorReportValve);
            });
        };
    }
}
